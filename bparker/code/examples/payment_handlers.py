"""
Payment Event Handlers - Production-Quality Implementation

Combines the async flow patterns from Chapter 2 with resilient API patterns:
- Retry with exponential backoff
- Circuit breaker for external services
- Structured logging
- Metrics collection

This implements the handlers referenced in ASYNC_FLOWS:
- payment.succeeded → update_balance
- payment.failed → log_failure
- process_refund (background job)
"""

import time
import random
import logging
import functools
from typing import TypeVar, Callable, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from decimal import Decimal


# =============================================================================
# Logging Setup
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger("payment_handlers")


# =============================================================================
# Custom Exceptions
# =============================================================================

class CircuitOpenError(Exception):
    """Raised when circuit breaker is open."""
    pass


class MaxRetriesExceededError(Exception):
    """Raised when all retries exhausted."""
    pass


class TransientError(Exception):
    """Base class for retryable errors."""
    pass


class PaymentServiceError(TransientError):
    """Payment service temporarily unavailable."""
    pass


class DatabaseError(TransientError):
    """Database temporarily unavailable."""
    pass


class BalanceUpdateError(Exception):
    """Failed to update balance."""
    pass


# =============================================================================
# Metrics Collection
# =============================================================================

@dataclass
class PaymentMetrics:
    """Metrics for payment operations."""
    
    # Counters
    payments_processed: int = 0
    payments_succeeded: int = 0
    payments_failed: int = 0
    refunds_processed: int = 0
    balance_updates: int = 0
    
    # Retry tracking
    total_retries: int = 0
    circuit_breaks: int = 0
    
    # Latency tracking
    total_latency_ms: float = 0.0
    
    # Amount tracking
    total_amount_processed: Decimal = field(default_factory=lambda: Decimal("0.00"))
    total_refunded: Decimal = field(default_factory=lambda: Decimal("0.00"))
    
    def record_payment(self, success: bool, amount: Decimal, latency_ms: float, retries: int = 0) -> None:
        """Record a payment processing attempt."""
        self.payments_processed += 1
        self.total_latency_ms += latency_ms
        self.total_retries += retries
        
        if success:
            self.payments_succeeded += 1
            self.total_amount_processed += amount
        else:
            self.payments_failed += 1
        
        logger.info(
            "METRIC | payment | success=%s amount=%.2f latency_ms=%.2f retries=%d",
            success, amount, latency_ms, retries
        )
    
    def record_refund(self, amount: Decimal) -> None:
        """Record a refund."""
        self.refunds_processed += 1
        self.total_refunded += amount
        logger.info("METRIC | refund | amount=%.2f", amount)
    
    def record_balance_update(self) -> None:
        """Record a balance update."""
        self.balance_updates += 1
    
    def record_circuit_break(self, service: str) -> None:
        """Record a circuit breaker activation."""
        self.circuit_breaks += 1
        logger.warning("METRIC | circuit_break | service=%s", service)
    
    @property
    def success_rate(self) -> float:
        if self.payments_processed == 0:
            return 100.0
        return (self.payments_succeeded / self.payments_processed) * 100
    
    @property
    def avg_latency_ms(self) -> float:
        if self.payments_processed == 0:
            return 0.0
        return self.total_latency_ms / self.payments_processed
    
    def summary(self) -> dict[str, Any]:
        """Get metrics summary."""
        return {
            "payments_processed": self.payments_processed,
            "payments_succeeded": self.payments_succeeded,
            "payments_failed": self.payments_failed,
            "success_rate": f"{self.success_rate:.1f}%",
            "avg_latency_ms": f"{self.avg_latency_ms:.2f}",
            "total_retries": self.total_retries,
            "circuit_breaks": self.circuit_breaks,
            "refunds_processed": self.refunds_processed,
            "balance_updates": self.balance_updates,
            "total_amount_processed": f"${self.total_amount_processed:.2f}",
            "total_refunded": f"${self.total_refunded:.2f}",
        }


# Global metrics instance
metrics = PaymentMetrics()


# =============================================================================
# Circuit Breaker
# =============================================================================

class CircuitState(Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


@dataclass
class CircuitBreaker:
    """Circuit breaker with logging and metrics."""
    
    name: str
    failure_threshold: int = 5
    recovery_timeout: float = 60.0
    half_open_max_calls: int = 3
    
    _failures: int = field(default=0, init=False)
    _state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    _last_failure_time: Optional[float] = field(default=None, init=False)
    _half_open_calls: int = field(default=0, init=False)
    
    @property
    def state(self) -> CircuitState:
        if self._state == CircuitState.OPEN and self._last_failure_time:
            if time.time() - self._last_failure_time >= self.recovery_timeout:
                logger.info("[%s] Circuit transitioning OPEN → HALF_OPEN", self.name)
                self._state = CircuitState.HALF_OPEN
                self._half_open_calls = 0
        return self._state
    
    def call(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        current_state = self.state
        
        if current_state == CircuitState.OPEN:
            time_remaining = self.recovery_timeout - (time.time() - (self._last_failure_time or 0))
            logger.warning(
                "[%s] Circuit OPEN - rejecting call (recovery in %.1fs)",
                self.name, time_remaining
            )
            metrics.record_circuit_break(self.name)
            raise CircuitOpenError(f"Circuit '{self.name}' is open")
        
        if current_state == CircuitState.HALF_OPEN:
            self._half_open_calls += 1
            logger.info(
                "[%s] Circuit HALF_OPEN - test call %d/%d",
                self.name, self._half_open_calls, self.half_open_max_calls
            )
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure(e)
            raise
    
    def _on_success(self) -> None:
        if self._state == CircuitState.HALF_OPEN:
            logger.info("[%s] Circuit recovering → CLOSED", self.name)
        self._failures = 0
        self._state = CircuitState.CLOSED
        self._half_open_calls = 0
    
    def _on_failure(self, error: Exception) -> None:
        self._failures += 1
        self._last_failure_time = time.time()
        
        logger.warning(
            "[%s] Failure %d/%d: %s",
            self.name, self._failures, self.failure_threshold, str(error)[:100]
        )
        
        if self._failures >= self.failure_threshold:
            self._state = CircuitState.OPEN
            logger.error("[%s] Circuit OPENED after %d failures", self.name, self._failures)
            metrics.record_circuit_break(self.name)


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
    retryable_exceptions: tuple = (TransientError,),
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Decorator for retry with exponential backoff."""
    
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception: Optional[Exception] = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                    
                except retryable_exceptions as e:
                    last_exception = e
                    
                    if attempt == max_retries:
                        logger.error(
                            "Max retries (%d) exceeded for %s: %s",
                            max_retries, func.__name__, e
                        )
                        raise MaxRetriesExceededError(
                            f"Failed after {max_retries} retries: {e}"
                        ) from e
                    
                    delay = min(base_delay * (exponential_base ** attempt), max_delay)
                    if jitter:
                        delay *= (0.75 + random.random() * 0.5)
                    
                    logger.warning(
                        "Retry %d/%d for %s in %.2fs: %s",
                        attempt + 1, max_retries, func.__name__, delay, e
                    )
                    time.sleep(delay)
            
            raise MaxRetriesExceededError(f"Unexpected: {last_exception}")
        
        return wrapper
    return decorator


# =============================================================================
# Mock Database & Services (Replace with real implementations)
# =============================================================================

class MockDatabase:
    """Mock database for demonstration."""
    
    def __init__(self):
        self._balances: dict[int, Decimal] = {
            1: Decimal("1000.00"),
            2: Decimal("500.00"),
            3: Decimal("250.00"),
        }
        self._audit_log: list[dict] = []
    
    def get_balance(self, user_id: int) -> Decimal:
        if random.random() < 0.1:  # 10% failure rate
            raise DatabaseError("Database connection timeout")
        return self._balances.get(user_id, Decimal("0.00"))
    
    def update_balance(self, user_id: int, new_balance: Decimal) -> None:
        if random.random() < 0.1:
            raise DatabaseError("Database write failed")
        self._balances[user_id] = new_balance
        logger.debug("DB: Updated balance for user %d to %.2f", user_id, new_balance)
    
    def add_audit_log(self, entry: dict) -> None:
        entry["timestamp"] = datetime.utcnow().isoformat()
        self._audit_log.append(entry)
        logger.debug("DB: Audit log entry added: %s", entry.get("action"))


class MockPaymentService:
    """Mock external payment service."""
    
    def verify_payment(self, payment_id: str) -> dict:
        if random.random() < 0.15:  # 15% failure rate
            raise PaymentServiceError("Payment service unavailable")
        return {
            "payment_id": payment_id,
            "verified": True,
            "amount": Decimal(str(random.randint(10, 500))),
        }
    
    def process_refund(self, payment_id: str, amount: Decimal) -> dict:
        if random.random() < 0.2:  # 20% failure rate
            raise PaymentServiceError("Refund service unavailable")
        return {
            "refund_id": f"ref_{payment_id}",
            "amount": amount,
            "status": "completed",
        }


# Initialize services
db = MockDatabase()
payment_service = MockPaymentService()

# Circuit breakers for external services
db_circuit = CircuitBreaker(name="database", failure_threshold=3, recovery_timeout=30.0)
payment_circuit = CircuitBreaker(name="payment_service", failure_threshold=5, recovery_timeout=60.0)


# =============================================================================
# Async Flow Inventory (from async_flow_debugger.py)
# =============================================================================

ASYNC_FLOWS = {
    "scheduled_tasks": [
        {"name": "nightly_reconciliation", "schedule": "0 3 * * *", "touches": ["balance", "transactions"]},
        {"name": "cleanup_old_sessions", "schedule": "0 0 * * *", "touches": ["sessions"]},
    ],
    "event_handlers": [
        {"event": "payment.succeeded", "handler": "update_balance", "touches": ["balance", "audit_log"]},
        {"event": "payment.failed", "handler": "log_failure", "touches": ["audit_log", "alerts"]},
    ],
    "background_jobs": [
        {"name": "send_notification", "queue": "notifications", "touches": ["notification_log"]},
        {"name": "process_refund", "queue": "payments", "touches": ["balance", "transactions", "audit_log"]},
    ],
}


# =============================================================================
# Event Handlers (with retry, circuit breaker, logging, metrics)
# =============================================================================

@retry_with_backoff(max_retries=3, base_delay=0.5, retryable_exceptions=(TransientError,))
def _fetch_and_verify_payment(payment_id: str) -> dict:
    """Fetch payment details with retry."""
    return payment_circuit.call(payment_service.verify_payment, payment_id)


@retry_with_backoff(max_retries=3, base_delay=0.5, retryable_exceptions=(TransientError,))
def _update_user_balance(user_id: int, amount: Decimal, operation: str) -> Decimal:
    """Update user balance with retry."""
    def do_update():
        current = db.get_balance(user_id)
        if operation == "credit":
            new_balance = current + amount
        elif operation == "debit":
            new_balance = current - amount
            if new_balance < 0:
                raise BalanceUpdateError(f"Insufficient balance: {current} < {amount}")
        else:
            raise ValueError(f"Unknown operation: {operation}")
        
        db.update_balance(user_id, new_balance)
        return new_balance
    
    return db_circuit.call(do_update)


@retry_with_backoff(max_retries=2, base_delay=0.3, retryable_exceptions=(TransientError,))
def _write_audit_log(entry: dict) -> None:
    """Write audit log with retry."""
    db_circuit.call(db.add_audit_log, entry)


def handle_payment_succeeded(event: dict) -> dict:
    """
    Handler for payment.succeeded events.
    
    Touches: balance, audit_log (as defined in ASYNC_FLOWS)
    
    Args:
        event: Payment event with payment_id, user_id, amount
        
    Returns:
        Result dict with new_balance and status
    """
    start_time = time.time()
    retries_used = 0
    
    payment_id = event.get("payment_id")
    user_id = event.get("user_id")
    
    logger.info(
        "EVENT | payment.succeeded | payment_id=%s user_id=%s",
        payment_id, user_id
    )
    
    try:
        # Step 1: Verify payment with external service
        logger.info("Verifying payment %s with payment service...", payment_id)
        payment_details = _fetch_and_verify_payment(payment_id)
        amount = payment_details["amount"]
        
        # Step 2: Update balance
        logger.info("Updating balance for user %d (+%.2f)...", user_id, amount)
        new_balance = _update_user_balance(user_id, amount, "credit")
        metrics.record_balance_update()
        
        # Step 3: Write audit log
        _write_audit_log({
            "action": "payment_credited",
            "user_id": user_id,
            "payment_id": payment_id,
            "amount": str(amount),
            "new_balance": str(new_balance),
        })
        
        latency_ms = (time.time() - start_time) * 1000
        metrics.record_payment(success=True, amount=amount, latency_ms=latency_ms)
        
        logger.info(
            "SUCCESS | payment.succeeded | user_id=%s amount=%.2f new_balance=%.2f latency_ms=%.2f",
            user_id, amount, new_balance, latency_ms
        )
        
        return {
            "status": "success",
            "user_id": user_id,
            "amount_credited": float(amount),
            "new_balance": float(new_balance),
        }
        
    except (CircuitOpenError, MaxRetriesExceededError) as e:
        latency_ms = (time.time() - start_time) * 1000
        metrics.record_payment(success=False, amount=Decimal("0"), latency_ms=latency_ms)
        
        logger.error(
            "FAILED | payment.succeeded | payment_id=%s error=%s",
            payment_id, str(e)
        )
        
        # Write failure to audit log (best effort)
        try:
            _write_audit_log({
                "action": "payment_failed",
                "user_id": user_id,
                "payment_id": payment_id,
                "error": str(e),
            })
        except Exception:
            logger.exception("Failed to write audit log for failed payment")
        
        return {
            "status": "failed",
            "error": str(e),
        }


def handle_payment_failed(event: dict) -> dict:
    """
    Handler for payment.failed events.
    
    Touches: audit_log, alerts (as defined in ASYNC_FLOWS)
    """
    payment_id = event.get("payment_id")
    user_id = event.get("user_id")
    reason = event.get("reason", "unknown")
    
    logger.warning(
        "EVENT | payment.failed | payment_id=%s user_id=%s reason=%s",
        payment_id, user_id, reason
    )
    
    try:
        _write_audit_log({
            "action": "payment_failed",
            "user_id": user_id,
            "payment_id": payment_id,
            "reason": reason,
        })
        
        # In production: send alert to monitoring system
        logger.warning("ALERT | Payment failed for user %s: %s", user_id, reason)
        
        return {"status": "logged", "alert_sent": True}
        
    except Exception as e:
        logger.exception("Failed to handle payment.failed event")
        return {"status": "error", "error": str(e)}


@retry_with_backoff(max_retries=3, base_delay=1.0, retryable_exceptions=(TransientError,))
def process_refund_job(job_data: dict) -> dict:
    """
    Background job: process_refund
    
    Touches: balance, transactions, audit_log (as defined in ASYNC_FLOWS)
    """
    payment_id = job_data.get("payment_id")
    user_id = job_data.get("user_id")
    amount = Decimal(str(job_data.get("amount", 0)))
    
    logger.info(
        "JOB | process_refund | payment_id=%s user_id=%s amount=%.2f",
        payment_id, user_id, amount
    )
    
    try:
        # Step 1: Process refund with payment service
        refund_result = payment_circuit.call(
            payment_service.process_refund, payment_id, amount
        )
        
        # Step 2: Credit user balance
        new_balance = _update_user_balance(user_id, amount, "credit")
        metrics.record_balance_update()
        metrics.record_refund(amount)
        
        # Step 3: Write audit log
        _write_audit_log({
            "action": "refund_processed",
            "user_id": user_id,
            "payment_id": payment_id,
            "refund_id": refund_result["refund_id"],
            "amount": str(amount),
            "new_balance": str(new_balance),
        })
        
        logger.info(
            "SUCCESS | process_refund | user_id=%s amount=%.2f new_balance=%.2f",
            user_id, amount, new_balance
        )
        
        return {
            "status": "success",
            "refund_id": refund_result["refund_id"],
            "new_balance": float(new_balance),
        }
        
    except Exception as e:
        logger.exception("FAILED | process_refund | payment_id=%s", payment_id)
        raise


# =============================================================================
# Demo
# =============================================================================

def demo():
    """Demonstrate the payment handlers."""
    print("\n" + "=" * 70)
    print("💳 PAYMENT HANDLERS DEMO")
    print("    With retry, circuit breaker, logging, and metrics")
    print("=" * 70)
    
    # Simulate payment.succeeded events
    print("\n📥 Processing payment.succeeded events...\n")
    
    for i in range(5):
        event = {
            "payment_id": f"pay_{i+1:03d}",
            "user_id": (i % 3) + 1,  # Users 1, 2, 3
        }
        
        result = handle_payment_succeeded(event)
        print(f"  Payment {i+1}: {result['status']}")
        time.sleep(0.3)
    
    # Simulate a payment.failed event
    print("\n📥 Processing payment.failed event...\n")
    
    result = handle_payment_failed({
        "payment_id": "pay_006",
        "user_id": 1,
        "reason": "card_declined",
    })
    print(f"  Result: {result}")
    
    # Simulate a refund job
    print("\n📥 Processing refund job...\n")
    
    try:
        result = process_refund_job({
            "payment_id": "pay_001",
            "user_id": 1,
            "amount": "50.00",
        })
        print(f"  Refund: {result['status']}")
    except Exception as e:
        print(f"  Refund failed: {e}")
    
    # Print metrics
    print("\n" + "=" * 70)
    print("📊 METRICS SUMMARY")
    print("=" * 70)
    
    for key, value in metrics.summary().items():
        print(f"  {key}: {value}")
    
    # Show what touches balance
    print("\n" + "=" * 70)
    print("🔍 ASYNC FLOWS THAT TOUCH 'balance'")
    print("=" * 70)
    
    for category, flows in ASYNC_FLOWS.items():
        for flow in flows:
            if "balance" in flow.get("touches", []):
                if category == "scheduled_tasks":
                    print(f"  ⏰ {flow['name']} ({flow['schedule']})")
                elif category == "event_handlers":
                    print(f"  🔔 {flow['event']} → {flow['handler']}")
                elif category == "background_jobs":
                    print(f"  🔄 {flow['name']} (queue: {flow['queue']})")
    
    print()


if __name__ == "__main__":
    demo()
