"""
Payment Service - Production Implementation

Implements POST /payments endpoint with:
- Input validation
- Stripe integration with retry/backoff
- Idempotency for duplicate prevention
- Comprehensive error handling
- Partial failure reconciliation

Edge Cases Handled:
1. Stripe timeout → retry with backoff
2. Stripe rate limit → queue and retry later
3. Duplicate payment → idempotency key
4. Card declined → user-friendly error
5. Partial failure → reconciliation queue
"""

import time
import uuid
import hashlib
import logging
import functools
from typing import Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum


# =============================================================================
# Logging
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
)
logger = logging.getLogger("payment_service")


# =============================================================================
# Error Hierarchy (BaseAPIError pattern)
# =============================================================================

class BaseAPIError(Exception):
    """Base error with consistent API response format."""
    
    def __init__(
        self,
        message: str,
        code: str,
        status_code: int = 400,
        details: Optional[dict] = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)
    
    def to_response(self) -> dict:
        """Convert to API response format."""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
            }
        }


class ValidationError(BaseAPIError):
    """Input validation failed."""
    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=400,
            details={"field": field} if field else {},
        )


class PaymentDeclinedError(BaseAPIError):
    """Payment was declined by the processor."""
    def __init__(self, decline_code: str, message: str):
        super().__init__(
            message=message,
            code="PAYMENT_DECLINED",
            status_code=402,
            details={"decline_code": decline_code},
        )


class DuplicatePaymentError(BaseAPIError):
    """Duplicate payment attempt detected."""
    def __init__(self, original_transaction_id: str):
        super().__init__(
            message="This payment has already been processed",
            code="DUPLICATE_PAYMENT",
            status_code=409,
            details={"original_transaction_id": original_transaction_id},
        )


class PaymentServiceUnavailableError(BaseAPIError):
    """Payment service temporarily unavailable."""
    def __init__(self, retry_after: Optional[int] = None):
        super().__init__(
            message="Payment service temporarily unavailable. Please try again.",
            code="SERVICE_UNAVAILABLE",
            status_code=503,
            details={"retry_after_seconds": retry_after} if retry_after else {},
        )


class PartialFailureError(BaseAPIError):
    """Payment succeeded but post-processing failed."""
    def __init__(self, stripe_charge_id: str, failure_reason: str):
        super().__init__(
            message="Payment processed but record creation failed. Support notified.",
            code="PARTIAL_FAILURE",
            status_code=500,
            details={
                "stripe_charge_id": stripe_charge_id,
                "failure_reason": failure_reason,
                "action": "Your payment was successful. Our team will ensure it's recorded.",
            },
        )


# =============================================================================
# Retry Decorator
# =============================================================================

class RetryableError(Exception):
    """Base for errors that should trigger retry."""
    pass


class StripeTimeoutError(RetryableError):
    """Stripe API timeout."""
    pass


class StripeRateLimitError(RetryableError):
    """Stripe rate limit hit."""
    def __init__(self, retry_after: int = 60):
        self.retry_after = retry_after
        super().__init__(f"Rate limited. Retry after {retry_after}s")


def retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    exponential_base: float = 2.0,
    retryable_exceptions: tuple = (RetryableError,),
):
    """
    Decorator for retry with exponential backoff.
    
    Args:
        max_retries: Maximum retry attempts
        base_delay: Initial delay in seconds
        max_delay: Maximum delay cap
        exponential_base: Multiplier for each retry
        retryable_exceptions: Exceptions that trigger retry
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
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
                        raise
                    
                    # Handle rate limit with specific delay
                    if isinstance(e, StripeRateLimitError):
                        delay = min(e.retry_after, max_delay)
                    else:
                        delay = min(base_delay * (exponential_base ** attempt), max_delay)
                    
                    logger.warning(
                        "Retry %d/%d for %s in %.1fs: %s",
                        attempt + 1, max_retries, func.__name__, delay, e
                    )
                    time.sleep(delay)
            
            raise last_exception
        return wrapper
    return decorator


# =============================================================================
# Data Models
# =============================================================================

class TransactionStatus(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


@dataclass
class User:
    id: int
    email: str
    balance: Decimal
    default_card_id: Optional[str] = None
    
    def has_valid_card(self) -> bool:
        return self.default_card_id is not None


@dataclass
class Transaction:
    id: str
    user_id: int
    amount: Decimal
    currency: str
    status: TransactionStatus
    stripe_charge_id: Optional[str] = None
    idempotency_key: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)
    error_message: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "amount": str(self.amount),
            "currency": self.currency,
            "status": self.status.value,
            "stripe_charge_id": self.stripe_charge_id,
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class PaymentRequest:
    """Validated payment request."""
    user_id: int
    amount: Decimal
    currency: str = "usd"
    description: Optional[str] = None
    idempotency_key: Optional[str] = None


# =============================================================================
# Mock Repositories (Replace with real DB implementations)
# =============================================================================

class UserRepository:
    """User data access."""
    
    _users = {
        1: User(id=1, email="alice@example.com", balance=Decimal("1000.00"), default_card_id="card_abc123"),
        2: User(id=2, email="bob@example.com", balance=Decimal("500.00"), default_card_id="card_def456"),
        3: User(id=3, email="charlie@example.com", balance=Decimal("250.00"), default_card_id=None),  # No card
    }
    
    def get_by_id(self, user_id: int) -> Optional[User]:
        return self._users.get(user_id)
    
    def update_balance(self, user_id: int, new_balance: Decimal) -> None:
        if user_id in self._users:
            self._users[user_id].balance = new_balance


class TransactionRepository:
    """Transaction data access."""
    
    _transactions: dict[str, Transaction] = {}
    _idempotency_index: dict[str, str] = {}  # idempotency_key -> transaction_id
    
    def create(self, transaction: Transaction) -> Transaction:
        self._transactions[transaction.id] = transaction
        if transaction.idempotency_key:
            self._idempotency_index[transaction.idempotency_key] = transaction.id
        return transaction
    
    def get_by_id(self, transaction_id: str) -> Optional[Transaction]:
        return self._transactions.get(transaction_id)
    
    def get_by_idempotency_key(self, key: str) -> Optional[Transaction]:
        tx_id = self._idempotency_index.get(key)
        return self._transactions.get(tx_id) if tx_id else None
    
    def update(self, transaction: Transaction) -> None:
        self._transactions[transaction.id] = transaction


class ReconciliationQueue:
    """Queue for partial failure reconciliation."""
    
    _queue: list[dict] = []
    
    def enqueue(self, item: dict) -> None:
        item["queued_at"] = datetime.utcnow().isoformat()
        self._queue.append(item)
        logger.warning("RECONCILIATION QUEUED: %s", item)
    
    def get_pending(self) -> list[dict]:
        return self._queue.copy()


# =============================================================================
# Mock Stripe Client
# =============================================================================

class MockStripeClient:
    """
    Mock Stripe API client.
    Replace with actual stripe library in production.
    """
    
    # Simulate various failure scenarios
    _failure_counter = 0
    
    def create_charge(
        self,
        amount: int,  # Amount in cents
        currency: str,
        customer: str,
        source: str,
        description: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> dict:
        """
        Create a charge via Stripe API.
        
        Simulates:
        - Timeouts (10% chance)
        - Rate limits (5% chance)
        - Card declines (10% chance)
        - Success (75% chance)
        """
        import random
        
        MockStripeClient._failure_counter += 1
        roll = random.random()
        
        # Simulate timeout
        if roll < 0.10:
            logger.debug("STRIPE: Simulating timeout")
            raise StripeTimeoutError("Connection to Stripe timed out")
        
        # Simulate rate limit
        if roll < 0.15:
            logger.debug("STRIPE: Simulating rate limit")
            raise StripeRateLimitError(retry_after=30)
        
        # Simulate card decline
        if roll < 0.25:
            logger.debug("STRIPE: Simulating card decline")
            return {
                "id": None,
                "status": "failed",
                "failure_code": "card_declined",
                "failure_message": "Your card was declined. Please try a different payment method.",
            }
        
        # Success
        charge_id = f"ch_{uuid.uuid4().hex[:24]}"
        logger.debug("STRIPE: Charge created: %s", charge_id)
        
        return {
            "id": charge_id,
            "amount": amount,
            "currency": currency,
            "status": "succeeded",
            "customer": customer,
            "source": source,
            "description": description,
        }


# =============================================================================
# Payment Service
# =============================================================================

class PaymentService:
    """
    Payment processing service.
    
    Handles the full payment flow:
    1. Validate request
    2. Check for duplicates (idempotency)
    3. Call Stripe with retry
    4. Create transaction record
    5. Update user balance
    6. Handle partial failures
    """
    
    def __init__(
        self,
        user_repo: UserRepository,
        transaction_repo: TransactionRepository,
        stripe_client: MockStripeClient,
        reconciliation_queue: ReconciliationQueue,
    ):
        self.user_repo = user_repo
        self.transaction_repo = transaction_repo
        self.stripe = stripe_client
        self.reconciliation_queue = reconciliation_queue
    
    def process_payment(self, request: PaymentRequest) -> dict:
        """
        Process a payment request.
        
        POST /payments endpoint implementation.
        
        Args:
            request: Validated payment request
            
        Returns:
            dict with transaction details
            
        Raises:
            ValidationError: Invalid input
            PaymentDeclinedError: Card was declined
            DuplicatePaymentError: Already processed
            PaymentServiceUnavailableError: Stripe unavailable
            PartialFailureError: Charge succeeded but DB failed
        """
        logger.info(
            "Processing payment | user_id=%d amount=%.2f currency=%s",
            request.user_id, request.amount, request.currency
        )
        
        # ─────────────────────────────────────────────────────────────────────
        # Step 1: Validate input
        # ─────────────────────────────────────────────────────────────────────
        self._validate_request(request)
        
        # ─────────────────────────────────────────────────────────────────────
        # Step 2: Check for duplicate (idempotency)
        # ─────────────────────────────────────────────────────────────────────
        idempotency_key = request.idempotency_key or self._generate_idempotency_key(request)
        
        existing = self.transaction_repo.get_by_idempotency_key(idempotency_key)
        if existing:
            if existing.status == TransactionStatus.COMPLETED:
                logger.info("Duplicate payment detected | transaction_id=%s", existing.id)
                raise DuplicatePaymentError(original_transaction_id=existing.id)
            elif existing.status == TransactionStatus.PENDING:
                # Return existing pending transaction
                return {"transaction": existing.to_dict(), "status": "pending"}
        
        # ─────────────────────────────────────────────────────────────────────
        # Step 3: Get user and validate card
        # ─────────────────────────────────────────────────────────────────────
        user = self.user_repo.get_by_id(request.user_id)
        if not user:
            raise ValidationError("User not found", field="user_id")
        
        if not user.has_valid_card():
            raise ValidationError(
                "No valid payment method on file. Please add a card.",
                field="payment_method"
            )
        
        # ─────────────────────────────────────────────────────────────────────
        # Step 4: Create pending transaction
        # ─────────────────────────────────────────────────────────────────────
        transaction = Transaction(
            id=f"txn_{uuid.uuid4().hex[:16]}",
            user_id=user.id,
            amount=request.amount,
            currency=request.currency,
            status=TransactionStatus.PENDING,
            idempotency_key=idempotency_key,
        )
        self.transaction_repo.create(transaction)
        
        logger.info("Transaction created | id=%s status=pending", transaction.id)
        
        # ─────────────────────────────────────────────────────────────────────
        # Step 5: Call Stripe with retry
        # ─────────────────────────────────────────────────────────────────────
        try:
            stripe_result = self._call_stripe_with_retry(
                user=user,
                amount=request.amount,
                currency=request.currency,
                description=request.description,
                idempotency_key=idempotency_key,
            )
        except (StripeTimeoutError, StripeRateLimitError) as e:
            # All retries exhausted
            transaction.status = TransactionStatus.FAILED
            transaction.error_message = str(e)
            self.transaction_repo.update(transaction)
            
            logger.error("Stripe unavailable after retries | transaction_id=%s", transaction.id)
            raise PaymentServiceUnavailableError(retry_after=60)
        
        # ─────────────────────────────────────────────────────────────────────
        # Step 6: Handle Stripe response
        # ─────────────────────────────────────────────────────────────────────
        if stripe_result.get("status") == "failed":
            transaction.status = TransactionStatus.FAILED
            transaction.error_message = stripe_result.get("failure_message")
            self.transaction_repo.update(transaction)
            
            logger.warning(
                "Payment declined | transaction_id=%s code=%s",
                transaction.id, stripe_result.get("failure_code")
            )
            raise PaymentDeclinedError(
                decline_code=stripe_result.get("failure_code", "unknown"),
                message=stripe_result.get("failure_message", "Your payment was declined."),
            )
        
        # ─────────────────────────────────────────────────────────────────────
        # Step 7: Update transaction with Stripe charge ID
        # ─────────────────────────────────────────────────────────────────────
        stripe_charge_id = stripe_result["id"]
        transaction.stripe_charge_id = stripe_charge_id
        transaction.status = TransactionStatus.COMPLETED
        
        try:
            self.transaction_repo.update(transaction)
        except Exception as e:
            # PARTIAL FAILURE: Charge succeeded but DB write failed
            logger.critical(
                "PARTIAL FAILURE | stripe_charge_id=%s transaction_id=%s error=%s",
                stripe_charge_id, transaction.id, e
            )
            self._handle_partial_failure(
                stripe_charge_id=stripe_charge_id,
                transaction=transaction,
                error=e,
            )
            raise PartialFailureError(
                stripe_charge_id=stripe_charge_id,
                failure_reason="Transaction record update failed",
            )
        
        # ─────────────────────────────────────────────────────────────────────
        # Step 8: Update user balance
        # ─────────────────────────────────────────────────────────────────────
        try:
            new_balance = user.balance + request.amount
            self.user_repo.update_balance(user.id, new_balance)
            
            logger.info(
                "Balance updated | user_id=%d old=%.2f new=%.2f",
                user.id, user.balance, new_balance
            )
        except Exception as e:
            # Balance update failed - queue for reconciliation
            logger.critical(
                "Balance update failed | user_id=%d transaction_id=%s error=%s",
                user.id, transaction.id, e
            )
            self._handle_partial_failure(
                stripe_charge_id=stripe_charge_id,
                transaction=transaction,
                error=e,
            )
            # Don't raise - payment succeeded, just needs reconciliation
        
        # ─────────────────────────────────────────────────────────────────────
        # Step 9: Return success response
        # ─────────────────────────────────────────────────────────────────────
        logger.info(
            "Payment completed | transaction_id=%s stripe_charge_id=%s amount=%.2f",
            transaction.id, stripe_charge_id, request.amount
        )
        
        return {
            "status": "success",
            "transaction": transaction.to_dict(),
        }
    
    def _validate_request(self, request: PaymentRequest) -> None:
        """Validate payment request fields."""
        if request.amount <= 0:
            raise ValidationError("Amount must be greater than 0", field="amount")
        
        if request.amount > Decimal("10000.00"):
            raise ValidationError("Amount exceeds maximum ($10,000)", field="amount")
        
        if request.currency not in ("usd", "eur", "gbp"):
            raise ValidationError("Unsupported currency", field="currency")
    
    def _generate_idempotency_key(self, request: PaymentRequest) -> str:
        """Generate idempotency key from request data."""
        data = f"{request.user_id}:{request.amount}:{request.currency}:{datetime.utcnow().date()}"
        return hashlib.sha256(data.encode()).hexdigest()[:32]
    
    @retry_with_backoff(
        max_retries=3,
        base_delay=1.0,
        max_delay=30.0,
        retryable_exceptions=(StripeTimeoutError, StripeRateLimitError),
    )
    def _call_stripe_with_retry(
        self,
        user: User,
        amount: Decimal,
        currency: str,
        description: Optional[str],
        idempotency_key: str,
    ) -> dict:
        """Call Stripe API with automatic retry on transient failures."""
        logger.debug("Calling Stripe API | amount=%.2f currency=%s", amount, currency)
        
        return self.stripe.create_charge(
            amount=int(amount * 100),  # Convert to cents
            currency=currency,
            customer=f"cus_{user.id}",
            source=user.default_card_id,
            description=description or f"Payment for user {user.id}",
            idempotency_key=idempotency_key,
        )
    
    def _handle_partial_failure(
        self,
        stripe_charge_id: str,
        transaction: Transaction,
        error: Exception,
    ) -> None:
        """Queue partial failure for reconciliation."""
        self.reconciliation_queue.enqueue({
            "type": "partial_payment_failure",
            "stripe_charge_id": stripe_charge_id,
            "transaction_id": transaction.id,
            "user_id": transaction.user_id,
            "amount": str(transaction.amount),
            "error": str(error),
            "action_required": "verify_and_complete_transaction",
        })


# =============================================================================
# API Endpoint Handler (Example)
# =============================================================================

def handle_post_payments(request_body: dict) -> tuple[dict, int]:
    """
    POST /payments endpoint handler.
    
    Args:
        request_body: JSON request body
        
    Returns:
        Tuple of (response_dict, status_code)
    """
    # Initialize service (in production, use dependency injection)
    service = PaymentService(
        user_repo=UserRepository(),
        transaction_repo=TransactionRepository(),
        stripe_client=MockStripeClient(),
        reconciliation_queue=ReconciliationQueue(),
    )
    
    try:
        # Parse request
        payment_request = PaymentRequest(
            user_id=request_body.get("user_id"),
            amount=Decimal(str(request_body.get("amount", 0))),
            currency=request_body.get("currency", "usd"),
            description=request_body.get("description"),
            idempotency_key=request_body.get("idempotency_key"),
        )
        
        # Process payment
        result = service.process_payment(payment_request)
        return result, 200
        
    except BaseAPIError as e:
        logger.warning("API Error: %s", e.message)
        return e.to_response(), e.status_code
        
    except Exception as e:
        logger.exception("Unexpected error processing payment")
        return {
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
            }
        }, 500


# =============================================================================
# Demo
# =============================================================================

def demo():
    """Demonstrate the payment service."""
    print("\n" + "=" * 70)
    print("💳 PAYMENT SERVICE DEMO")
    print("=" * 70)
    
    # Test cases
    test_cases = [
        # Success case
        {"user_id": 1, "amount": "99.99", "description": "Test payment"},
        
        # User with no card
        {"user_id": 3, "amount": "50.00"},
        
        # Invalid amount
        {"user_id": 1, "amount": "-10.00"},
        
        # Amount too high
        {"user_id": 1, "amount": "15000.00"},
        
        # Another success (may hit decline, timeout, etc.)
        {"user_id": 2, "amount": "250.00"},
        
        # Duplicate with same idempotency key
        {"user_id": 1, "amount": "99.99", "idempotency_key": "test_key_123"},
        {"user_id": 1, "amount": "99.99", "idempotency_key": "test_key_123"},
    ]
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n{'─' * 70}")
        print(f"Test {i}: {test}")
        print(f"{'─' * 70}")
        
        response, status_code = handle_post_payments(test)
        
        print(f"\nStatus: {status_code}")
        
        if "error" in response:
            print(f"Error: {response['error']['code']} - {response['error']['message']}")
        else:
            print(f"Success: Transaction {response.get('transaction', {}).get('id')}")
        
        time.sleep(0.5)
    
    print("\n" + "=" * 70)
    print("Demo complete!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    demo()
