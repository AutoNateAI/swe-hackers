"""
Resilient API Client - Production-Quality Patterns

Demonstrates:
- Retry with exponential backoff
- Circuit breaker pattern
- Structured logging
- Metrics collection

Based on Chapter 2 (Lightning Paths) patterns for handling async flows reliably.
"""

import time
import random
import logging
import functools
from typing import TypeVar, Callable, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from contextlib import contextmanager

# =============================================================================
# Logging Setup
# =============================================================================

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger("resilient_api")


# =============================================================================
# Custom Exceptions
# =============================================================================

class CircuitOpenError(Exception):
    """Raised when the circuit breaker is open and rejecting calls."""
    pass


class MaxRetriesExceededError(Exception):
    """Raised when all retry attempts have been exhausted."""
    pass


class TransientError(Exception):
    """Base class for errors that should trigger a retry."""
    pass


class RateLimitError(TransientError):
    """Raised when API rate limit is hit."""
    pass


class ServiceUnavailableError(TransientError):
    """Raised when the service is temporarily unavailable."""
    pass


# =============================================================================
# Metrics Collection
# =============================================================================

@dataclass
class Metrics:
    """
    Simple metrics collector for monitoring API health.
    
    In production, replace with Prometheus, StatsD, or your metrics system.
    """
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    retries: int = 0
    circuit_breaks: int = 0
    total_latency_ms: float = 0.0
    _call_history: list = field(default_factory=list)
    
    def record_call(self, success: bool, latency_ms: float, retries: int = 0) -> None:
        """Record a completed API call."""
        self.total_calls += 1
        self.total_latency_ms += latency_ms
        self.retries += retries
        
        if success:
            self.successful_calls += 1
        else:
            self.failed_calls += 1
        
        self._call_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "success": success,
            "latency_ms": latency_ms,
            "retries": retries,
        })
        
        # Keep only last 1000 calls
        if len(self._call_history) > 1000:
            self._call_history = self._call_history[-1000:]
    
    def record_circuit_break(self) -> None:
        """Record when circuit breaker opens."""
        self.circuit_breaks += 1
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate as percentage."""
        if self.total_calls == 0:
            return 100.0
        return (self.successful_calls / self.total_calls) * 100
    
    @property
    def avg_latency_ms(self) -> float:
        """Calculate average latency."""
        if self.total_calls == 0:
            return 0.0
        return self.total_latency_ms / self.total_calls
    
    def summary(self) -> dict[str, Any]:
        """Get metrics summary."""
        return {
            "total_calls": self.total_calls,
            "successful_calls": self.successful_calls,
            "failed_calls": self.failed_calls,
            "success_rate": f"{self.success_rate:.1f}%",
            "avg_latency_ms": f"{self.avg_latency_ms:.2f}",
            "total_retries": self.retries,
            "circuit_breaks": self.circuit_breaks,
        }


# Global metrics instance
metrics = Metrics()


# =============================================================================
# Circuit Breaker
# =============================================================================

class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "CLOSED"      # Normal operation
    OPEN = "OPEN"          # Failing fast, rejecting calls
    HALF_OPEN = "HALF_OPEN"  # Testing if service recovered


@dataclass
class CircuitBreaker:
    """
    Circuit breaker pattern implementation.
    
    Prevents cascading failures by stopping calls to a failing service
    and allowing it time to recover.
    
    States:
        CLOSED: Normal operation, calls pass through
        OPEN: Service is failing, calls are rejected immediately
        HALF_OPEN: Testing recovery, allowing limited calls through
    
    Args:
        failure_threshold: Number of failures before opening circuit
        recovery_timeout: Seconds to wait before testing recovery
        half_open_max_calls: Max calls allowed in half-open state
        
    Example:
        >>> breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=30)
        >>> result = breaker.call(api_client.fetch_user, user_id=123)
    """
    failure_threshold: int = 5
    recovery_timeout: float = 60.0
    half_open_max_calls: int = 3
    
    # Internal state
    _failures: int = field(default=0, init=False)
    _state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    _last_failure_time: Optional[float] = field(default=None, init=False)
    _half_open_calls: int = field(default=0, init=False)
    
    @property
    def state(self) -> CircuitState:
        """Get current circuit state, checking for recovery."""
        if self._state == CircuitState.OPEN:
            if self._last_failure_time is not None:
                elapsed = time.time() - self._last_failure_time
                if elapsed >= self.recovery_timeout:
                    logger.info(
                        "Circuit transitioning to HALF_OPEN after %.1fs recovery timeout",
                        elapsed
                    )
                    self._state = CircuitState.HALF_OPEN
                    self._half_open_calls = 0
        return self._state
    
    def call(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        """
        Execute a function through the circuit breaker.
        
        Args:
            func: The function to call
            *args, **kwargs: Arguments to pass to the function
            
        Returns:
            The function's return value
            
        Raises:
            CircuitOpenError: If circuit is open and rejecting calls
        """
        current_state = self.state  # This checks for recovery
        
        if current_state == CircuitState.OPEN:
            logger.warning(
                "Circuit OPEN - rejecting call to %s (failures: %d, recovery in: %.1fs)",
                func.__name__,
                self._failures,
                self.recovery_timeout - (time.time() - (self._last_failure_time or 0))
            )
            metrics.record_circuit_break()
            raise CircuitOpenError(
                f"Circuit is open. Recovery in {self.recovery_timeout}s. "
                f"Failures: {self._failures}"
            )
        
        if current_state == CircuitState.HALF_OPEN:
            if self._half_open_calls >= self.half_open_max_calls:
                logger.warning("Circuit HALF_OPEN - max test calls reached, rejecting")
                raise CircuitOpenError("Circuit half-open, max test calls reached")
            self._half_open_calls += 1
            logger.info(
                "Circuit HALF_OPEN - allowing test call %d/%d to %s",
                self._half_open_calls,
                self.half_open_max_calls,
                func.__name__
            )
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure(e)
            raise
    
    def _on_success(self) -> None:
        """Handle successful call."""
        if self._state == CircuitState.HALF_OPEN:
            logger.info("Circuit recovering - test call succeeded, closing circuit")
        
        self._failures = 0
        self._state = CircuitState.CLOSED
        self._half_open_calls = 0
    
    def _on_failure(self, error: Exception) -> None:
        """Handle failed call."""
        self._failures += 1
        self._last_failure_time = time.time()
        
        logger.warning(
            "Circuit recorded failure %d/%d: %s",
            self._failures,
            self.failure_threshold,
            str(error)[:100]
        )
        
        if self._failures >= self.failure_threshold:
            self._state = CircuitState.OPEN
            logger.error(
                "Circuit OPENED after %d failures. Will retry in %.1fs",
                self._failures,
                self.recovery_timeout
            )
            metrics.record_circuit_break()
    
    def reset(self) -> None:
        """Manually reset the circuit breaker."""
        logger.info("Circuit manually reset")
        self._failures = 0
        self._state = CircuitState.CLOSED
        self._last_failure_time = None
        self._half_open_calls = 0


# =============================================================================
# Retry with Exponential Backoff
# =============================================================================

T = TypeVar('T')


def retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    retryable_exceptions: tuple = (TransientError, ConnectionError, TimeoutError),
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator for retry with exponential backoff.
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay between retries (seconds)
        max_delay: Maximum delay between retries (seconds)
        exponential_base: Base for exponential calculation
        jitter: Add random jitter to prevent thundering herd
        retryable_exceptions: Tuple of exceptions that should trigger retry
        
    Example:
        @retry_with_backoff(max_retries=3, base_delay=1.0)
        def fetch_user(user_id: int) -> dict:
            return api.get(f"/users/{user_id}")
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception: Optional[Exception] = None
            retries_used = 0
            
            for attempt in range(max_retries + 1):
                try:
                    start_time = time.time()
                    result = func(*args, **kwargs)
                    latency_ms = (time.time() - start_time) * 1000
                    
                    # Record successful call
                    metrics.record_call(
                        success=True,
                        latency_ms=latency_ms,
                        retries=retries_used
                    )
                    
                    if retries_used > 0:
                        logger.info(
                            "Call to %s succeeded after %d retries (%.2fms)",
                            func.__name__,
                            retries_used,
                            latency_ms
                        )
                    
                    return result
                    
                except retryable_exceptions as e:
                    last_exception = e
                    retries_used = attempt + 1
                    
                    if attempt == max_retries:
                        logger.error(
                            "Max retries (%d) exceeded for %s: %s",
                            max_retries,
                            func.__name__,
                            str(e)
                        )
                        metrics.record_call(
                            success=False,
                            latency_ms=0,
                            retries=retries_used
                        )
                        raise MaxRetriesExceededError(
                            f"Failed after {max_retries} retries: {e}"
                        ) from e
                    
                    # Calculate delay with exponential backoff
                    delay = min(
                        base_delay * (exponential_base ** attempt),
                        max_delay
                    )
                    
                    # Add jitter (±25%) to prevent thundering herd
                    if jitter:
                        delay = delay * (0.75 + random.random() * 0.5)
                    
                    logger.warning(
                        "Retry %d/%d for %s after %.2fs: %s",
                        attempt + 1,
                        max_retries,
                        func.__name__,
                        delay,
                        str(e)[:100]
                    )
                    
                    time.sleep(delay)
                    
                except Exception as e:
                    # Non-retryable exception
                    logger.error(
                        "Non-retryable error in %s: %s",
                        func.__name__,
                        str(e)
                    )
                    metrics.record_call(success=False, latency_ms=0, retries=retries_used)
                    raise
            
            # Should never reach here, but just in case
            raise MaxRetriesExceededError(f"Unexpected retry failure: {last_exception}")
        
        return wrapper
    return decorator


# =============================================================================
# Resilient API Client
# =============================================================================

class ResilientAPIClient:
    """
    Production-ready API client with resilience patterns.
    
    Features:
        - Automatic retry with exponential backoff
        - Circuit breaker for failing services
        - Structured logging
        - Metrics collection
        
    Example:
        client = ResilientAPIClient(base_url="https://api.example.com")
        user = client.get("/users/123")
    """
    
    def __init__(
        self,
        base_url: str,
        timeout: float = 30.0,
        circuit_breaker: Optional[CircuitBreaker] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.circuit_breaker = circuit_breaker or CircuitBreaker()
        self.logger = logging.getLogger(f"api_client.{base_url}")
    
    @retry_with_backoff(max_retries=3, base_delay=1.0)
    def _make_request(self, method: str, endpoint: str, **kwargs: Any) -> dict:
        """
        Make an HTTP request (mock implementation).
        
        In production, replace with actual HTTP client (httpx, requests, aiohttp).
        """
        url = f"{self.base_url}{endpoint}"
        
        self.logger.debug("Making %s request to %s", method, url)
        
        # Simulate API call - replace with real implementation
        # Example with httpx:
        # response = httpx.request(method, url, timeout=self.timeout, **kwargs)
        # response.raise_for_status()
        # return response.json()
        
        # Mock: randomly fail to demonstrate retry/circuit breaker
        if random.random() < 0.3:  # 30% failure rate for demo
            if random.random() < 0.5:
                raise ServiceUnavailableError("Service temporarily unavailable")
            else:
                raise RateLimitError("Rate limit exceeded")
        
        # Mock success response
        return {"status": "ok", "url": url, "method": method}
    
    def request(self, method: str, endpoint: str, **kwargs: Any) -> dict:
        """
        Make a request through the circuit breaker.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (e.g., "/users/123")
            **kwargs: Additional arguments passed to the HTTP client
            
        Returns:
            Parsed JSON response
            
        Raises:
            CircuitOpenError: If circuit breaker is open
            MaxRetriesExceededError: If all retries exhausted
        """
        return self.circuit_breaker.call(
            self._make_request,
            method,
            endpoint,
            **kwargs
        )
    
    def get(self, endpoint: str, **kwargs: Any) -> dict:
        """Make a GET request."""
        return self.request("GET", endpoint, **kwargs)
    
    def post(self, endpoint: str, **kwargs: Any) -> dict:
        """Make a POST request."""
        return self.request("POST", endpoint, **kwargs)
    
    def put(self, endpoint: str, **kwargs: Any) -> dict:
        """Make a PUT request."""
        return self.request("PUT", endpoint, **kwargs)
    
    def delete(self, endpoint: str, **kwargs: Any) -> dict:
        """Make a DELETE request."""
        return self.request("DELETE", endpoint, **kwargs)


# =============================================================================
# Context Manager for Timing
# =============================================================================

@contextmanager
def timed_operation(operation_name: str):
    """Context manager to log operation timing."""
    start = time.time()
    logger.info("Starting: %s", operation_name)
    try:
        yield
    finally:
        elapsed = (time.time() - start) * 1000
        logger.info("Completed: %s (%.2fms)", operation_name, elapsed)


# =============================================================================
# Demo / Usage
# =============================================================================

def demo():
    """Demonstrate the resilient API client."""
    print("\n" + "=" * 60)
    print("🔧 RESILIENT API CLIENT DEMO")
    print("=" * 60)
    
    # Create client
    client = ResilientAPIClient(
        base_url="https://api.example.com",
        circuit_breaker=CircuitBreaker(
            failure_threshold=3,
            recovery_timeout=10.0
        )
    )
    
    # Make several calls to demonstrate patterns
    print("\n📡 Making API calls (30% simulated failure rate)...\n")
    
    for i in range(10):
        with timed_operation(f"API call #{i+1}"):
            try:
                result = client.get(f"/users/{i+1}")
                print(f"  ✅ Success: {result}")
            except CircuitOpenError as e:
                print(f"  🔴 Circuit Open: {e}")
            except MaxRetriesExceededError as e:
                print(f"  ❌ Max Retries: {e}")
            except Exception as e:
                print(f"  ⚠️ Error: {e}")
        
        time.sleep(0.5)  # Small delay between calls
    
    # Print metrics summary
    print("\n" + "=" * 60)
    print("📊 METRICS SUMMARY")
    print("=" * 60)
    for key, value in metrics.summary().items():
        print(f"  {key}: {value}")
    print()


if __name__ == "__main__":
    demo()
