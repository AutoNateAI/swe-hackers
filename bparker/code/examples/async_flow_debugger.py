"""
Async Flow Debugger - Find What Modifies Your Data

This utility helps you track down bugs by identifying all async processes
that touch a given field. Based on the "Lightning Paths" debugging method
from Chapter 2 of the Junior Accelerator course.

Usage:
    python async_flow_debugger.py balance
    python async_flow_debugger.py --list-all
"""

from typing import TypedDict
import argparse


# =============================================================================
# Type Definitions
# =============================================================================

class ScheduledTask(TypedDict):
    """A scheduled/cron task that runs on a schedule."""
    name: str
    schedule: str  # Cron format: "minute hour day month weekday"
    touches: list[str]


class EventHandler(TypedDict):
    """An event handler triggered by system events."""
    event: str
    handler: str
    touches: list[str]


class BackgroundJob(TypedDict):
    """A background job processed from a queue."""
    name: str
    queue: str
    touches: list[str]


class AsyncFlows(TypedDict):
    """Complete inventory of async flows in the system."""
    scheduled_tasks: list[ScheduledTask]
    event_handlers: list[EventHandler]
    background_jobs: list[BackgroundJob]


# =============================================================================
# Async Flow Inventory
# =============================================================================
# 
# 📝 CUSTOMIZE THIS for your actual codebase!
# Add every scheduled task, event handler, and background job.
# This becomes your debugging reference.

ASYNC_FLOWS: AsyncFlows = {
    "scheduled_tasks": [
        {
            "name": "nightly_reconciliation",
            "schedule": "0 3 * * *",  # 3 AM daily
            "touches": ["balance", "transactions"],
        },
        {
            "name": "cleanup_old_sessions",
            "schedule": "0 0 * * *",  # Midnight daily
            "touches": ["sessions"],
        },
        {
            "name": "generate_reports",
            "schedule": "0 6 * * 1",  # 6 AM every Monday
            "touches": ["reports", "analytics"],
        },
    ],
    "event_handlers": [
        {
            "event": "payment.succeeded",
            "handler": "update_balance",
            "touches": ["balance", "audit_log"],
        },
        {
            "event": "payment.failed",
            "handler": "log_failure",
            "touches": ["audit_log", "alerts"],
        },
        {
            "event": "user.registered",
            "handler": "send_welcome_email",
            "touches": ["email_log", "user_preferences"],
        },
    ],
    "background_jobs": [
        {
            "name": "send_notification",
            "queue": "notifications",
            "touches": ["notification_log"],
        },
        {
            "name": "process_refund",
            "queue": "payments",
            "touches": ["balance", "transactions", "audit_log"],
        },
        {
            "name": "resize_image",
            "queue": "media",
            "touches": ["media_storage", "user_profile"],
        },
    ],
}


# =============================================================================
# Debugging Functions
# =============================================================================

def find_writers(field: str) -> list[str]:
    """
    Find all async processes that touch a given field.
    
    Args:
        field: The data field to search for (e.g., "balance", "transactions")
        
    Returns:
        List of formatted strings describing each writer
        
    Example:
        >>> find_writers("balance")
        ['⏰ Scheduled: nightly_reconciliation (0 3 * * *)', ...]
    """
    writers = []
    
    for task in ASYNC_FLOWS["scheduled_tasks"]:
        if field in task["touches"]:
            writers.append(
                f"⏰ Scheduled: {task['name']} (cron: {task['schedule']})"
            )
    
    for handler in ASYNC_FLOWS["event_handlers"]:
        if field in handler["touches"]:
            writers.append(
                f"🔔 Event: {handler['event']} → {handler['handler']}"
            )
    
    for job in ASYNC_FLOWS["background_jobs"]:
        if field in job["touches"]:
            writers.append(
                f"🔄 Job: {job['name']} (queue: {job['queue']})"
            )
    
    return writers


def get_all_fields() -> set[str]:
    """Get all unique fields that are touched by any async process."""
    fields: set[str] = set()
    
    for task in ASYNC_FLOWS["scheduled_tasks"]:
        fields.update(task["touches"])
    
    for handler in ASYNC_FLOWS["event_handlers"]:
        fields.update(handler["touches"])
    
    for job in ASYNC_FLOWS["background_jobs"]:
        fields.update(job["touches"])
    
    return fields


def print_all_flows() -> None:
    """Print a complete inventory of all async flows."""
    print("\n" + "=" * 60)
    print("📋 COMPLETE ASYNC FLOW INVENTORY")
    print("=" * 60)
    
    print("\n⏰ SCHEDULED TASKS")
    print("-" * 40)
    for task in ASYNC_FLOWS["scheduled_tasks"]:
        print(f"  {task['name']}")
        print(f"    Schedule: {task['schedule']}")
        print(f"    Touches:  {', '.join(task['touches'])}")
        print()
    
    print("🔔 EVENT HANDLERS")
    print("-" * 40)
    for handler in ASYNC_FLOWS["event_handlers"]:
        print(f"  {handler['event']} → {handler['handler']}")
        print(f"    Touches: {', '.join(handler['touches'])}")
        print()
    
    print("🔄 BACKGROUND JOBS")
    print("-" * 40)
    for job in ASYNC_FLOWS["background_jobs"]:
        print(f"  {job['name']} (queue: {job['queue']})")
        print(f"    Touches: {', '.join(job['touches'])}")
        print()
    
    print("📊 ALL TRACKED FIELDS")
    print("-" * 40)
    for field in sorted(get_all_fields()):
        writers = find_writers(field)
        print(f"  {field}: {len(writers)} writer(s)")


def debug_field(field: str) -> None:
    """Debug a specific field by showing all its writers."""
    writers = find_writers(field)
    
    print(f"\n🔍 Who modifies '{field}'?\n")
    
    if not writers:
        print(f"  ⚠️  No async processes found that touch '{field}'")
        print(f"\n  Available fields: {', '.join(sorted(get_all_fields()))}")
    else:
        print(f"  Found {len(writers)} async process(es):\n")
        for writer in writers:
            print(f"    {writer}")
    
    print()


# =============================================================================
# CLI Interface
# =============================================================================

def main() -> None:
    """Main entry point for CLI usage."""
    parser = argparse.ArgumentParser(
        description="Find async processes that modify a data field",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python async_flow_debugger.py balance        # Find what modifies 'balance'
  python async_flow_debugger.py --list-all     # Show all async flows
  python async_flow_debugger.py --fields       # List all tracked fields
        """
    )
    
    parser.add_argument(
        "field",
        nargs="?",
        help="The field to debug (e.g., 'balance', 'transactions')"
    )
    
    parser.add_argument(
        "--list-all", "-l",
        action="store_true",
        help="List all async flows in the system"
    )
    
    parser.add_argument(
        "--fields", "-f",
        action="store_true",
        help="List all tracked fields"
    )
    
    args = parser.parse_args()
    
    if args.list_all:
        print_all_flows()
    elif args.fields:
        print("\n📊 Tracked fields:")
        for field in sorted(get_all_fields()):
            print(f"  • {field}")
        print()
    elif args.field:
        debug_field(args.field)
    else:
        # Default: show balance example (the course debugging scenario)
        debug_field("balance")


if __name__ == "__main__":
    main()
