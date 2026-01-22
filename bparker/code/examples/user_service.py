"""
User Service Module - Production Quality Example

This module demonstrates the difference between junior and senior code patterns.
Used as a teaching example in The Junior Accelerator course.

Junior code: works but fragile
Senior code: secure, typed, documented, maintainable
"""

from typing import Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# Database Layer (Mock for demonstration)
# =============================================================================

class MockDatabase:
    """
    Mock database for demonstration purposes.
    In production, replace with actual database connection (SQLAlchemy, psycopg2, etc.)
    """
    
    def __init__(self) -> None:
        # Simulated user data
        self._users = {
            1: {"id": 1, "name": "Alice", "email": "alice@example.com", "is_active": True},
            2: {"id": 2, "name": "Bob", "email": "bob@example.com", "is_active": True},
            3: {"id": 3, "name": "Charlie", "email": "charlie@example.com", "is_active": False},
        }
    
    def query(self, sql: str, params: tuple) -> Optional[dict[str, Any]]:
        """
        Execute a parameterized query (mock implementation).
        
        Args:
            sql: SQL query string with %s placeholders
            params: Tuple of parameters to substitute
            
        Returns:
            Query result as dict, or None if not found
        """
        # In a real implementation, this would execute actual SQL
        # For demo purposes, we just look up by ID
        user_id = params[0] if params else None
        return self._users.get(user_id)


# Global database instance (in production, use dependency injection)
db = MockDatabase()


# =============================================================================
# Custom Exceptions
# =============================================================================

class UserNotFoundError(Exception):
    """Raised when a user cannot be found."""
    pass


# =============================================================================
# Data Models
# =============================================================================

@dataclass(frozen=True)
class User:
    """
    Represents a user in the system.
    
    Attributes:
        id: Unique identifier for the user.
        name: User's display name.
        email: User's email address.
        is_active: Whether the user account is active.
        created_at: Timestamp when user was created.
    """
    id: int
    name: str
    email: str
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def __post_init__(self) -> None:
        """Validate user data on creation."""
        if not self.email or "@" not in self.email:
            raise ValueError(f"Invalid email format: {self.email}")


# =============================================================================
# Service Functions
# =============================================================================

def get_user(user_id: int, *, raise_on_missing: bool = False) -> Optional[User]:
    """
    Retrieve a user by their unique identifier.
    
    Args:
        user_id: The unique identifier of the user. Must be positive.
        raise_on_missing: If True, raises UserNotFoundError instead of returning None.
        
    Returns:
        User object if found, None otherwise (unless raise_on_missing=True).
        
    Raises:
        TypeError: If user_id is not an integer.
        ValueError: If user_id is not a positive integer.
        UserNotFoundError: If user not found and raise_on_missing=True.
        
    Example:
        >>> user = get_user(123)
        >>> if user:
        ...     print(f"Found {user.name}")
        
        >>> # Or raise on missing:
        >>> try:
        ...     user = get_user(456, raise_on_missing=True)
        ... except UserNotFoundError:
        ...     print("User not found!")
    """
    if not isinstance(user_id, int):
        raise TypeError(f"user_id must be int, got {type(user_id).__name__}")
    if user_id < 1:
        raise ValueError(f"user_id must be positive, got {user_id}")
    
    logger.debug("Fetching user with id=%d", user_id)
    
    # Parameterized query prevents SQL injection
    result = db.query("SELECT * FROM users WHERE id = %s", (user_id,))
    
    if not result:
        logger.warning("User not found: id=%d", user_id)
        if raise_on_missing:
            raise UserNotFoundError(f"No user with id={user_id}")
        return None
    
    return User(**result)


# =============================================================================
# Comparison: Junior vs Senior Code
# =============================================================================

# ❌ JUNIOR CODE - Works but fragile:
#
# def get_user(user_id):
#     user = db.query(f"SELECT * FROM users WHERE id = {user_id}")
#     return user
#
# Problems:
# - SQL injection vulnerability (f-string in query)
# - No type hints (harder to understand and maintain)
# - No documentation (what does it return? what errors?)
# - No input validation (negative IDs? strings?)
# - No logging (hard to debug in production)
# - Returns raw dict (no structure or validation)

# ✅ SENIOR CODE - Secure, typed, documented:
# See the get_user() function above for the production-quality version.
#
# Improvements:
# - Parameterized queries (prevents SQL injection)
# - Type hints (self-documenting, IDE support, static analysis)
# - Comprehensive docstring (args, returns, raises, examples)
# - Input validation with clear error messages
# - Logging for production debugging
# - Dataclass for structured, validated data
# - Custom exceptions for specific error handling
# - Immutable data (frozen=True) prevents bugs
