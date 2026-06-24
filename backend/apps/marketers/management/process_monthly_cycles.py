"""
Management command: process_monthly_cycles

Closes out any Marketer monthly cycle(s) that have elapsed (MARKETER_CYCLE_DAYS
= 30 by default, anchored per-account on `cycle_anchor_date`), resets the
monthly counters, and force-settles any leftover monthly profit balance.

Design notes (see PROGRESS.md — Part A3 report for the full rationale):

- Uses the existing `Marketer.get_cycle_end(cycle_number)` helper (already on
  the model from Part A1) instead of re-deriving the date math here, so there
  is exactly one place in the codebase that defines "when does cycle N end".

- `cycle_anchor_date` is a plain DateField (not datetime), so this command
  compares against `timezone.localdate()` (a date, Africa/Cairo per settings),
  not `timezone.now()`.

- Idempotent by construction. Cycle closure is driven by comparing today
  against `marketer.get_cycle_end()`, i.e. the *state of the data itself*
  (current_cycle_number), not a separately tracked "last run" timestamp. Once
  a cycle closes, current_cycle_number is incremented, so re-running this
  command any number of times on the same day is a no-op for marketers that
  are already caught up.

- Handles multiple missed cycles in one run. If the command/cron didn't run
  for 70 days, a `while` loop closes one cycle at a time per marketer until
  caught up, instead of jumping straight to "now" and only closing once.

- Forced settlement reuses WithdrawalRequest (status="paid") with a new
  `is_forced_settlement` boolean field, instead of a separate ForcedSettlement
  model. This needs a small model change — see MODELS_PATCH_NOTE.md. Decision
  rationale: a single ledger of "money that left the monthly balance" is
  simpler to report on later (sum of WithdrawalRequest where status=paid =
  total payouts, whether marketer-requested or cycle-forced), and the flag is
  enough to tell the two apart in the dashboard. **This needs your sign-off
  before Part A4** — flagged in PROGRESS.md.

- Lifetime counters (lifetime_total_orders, lifetime_total_profit) are NEVER
  touched here — only monthly_* fields are reset.

- Each marketer is processed inside its own transaction.atomic() block with
  select_for_update(), so a lock on one marketer's row never blocks the rest
  of the batch, and this stays safe to run alongside a withdrawal-request
  endpoint (Part A6) that should also lock the same row before reading/writing
  monthly_profit_balance.

Usage:
    python manage.py process_monthly_cycles
    python manage.py process_monthly_cycles --dry-run
"""

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.marketers.models import Marketer, WithdrawalRequest


class Command(BaseCommand):
    help = (
        "Closes elapsed 30-day marketer cycles (per-account anchor), resets "
        "monthly counters, and force-settles any leftover monthly profit "
        "balance via an automatic WithdrawalRequest (is_forced_settlement=True)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would happen without writing any changes.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        today = timezone.localdate()

        marketers_touched = 0
        cycles_closed = 0
        settlements_created = 0
        settled_total = Decimal("0")

        # One atomic block per marketer (not one transaction for the whole
        # batch): a lock on a single row should never block processing of
        # everyone else, and one marketer failing shouldn't roll back work
        # already committed for others.
        marketer_ids = list(
            Marketer.objects.order_by("id").values_list("id", flat=True)
        )

        for marketer_id in marketer_ids:
            with transaction.atomic():
                try:
                    marketer = Marketer.objects.select_for_update().get(
                        id=marketer_id
                    )
                except Marketer.DoesNotExist:
                    continue

                touched = False

                while today >= marketer.get_cycle_end():
                    touched = True
                    cycles_closed += 1
                    closing_cycle_number = marketer.current_cycle_number

                    if marketer.monthly_profit_balance > 0:
                        settlements_created += 1
                        settled_total += marketer.monthly_profit_balance
                        self.stdout.write(
                            f"  -> marketer #{marketer.id} ({marketer.user.email}): "
                            f"closing cycle {closing_cycle_number}, "
                            f"force-settling {marketer.monthly_profit_balance}"
                        )
                        if not dry_run:
                            WithdrawalRequest.objects.create(
                                marketer=marketer,
                                amount=marketer.monthly_profit_balance,
                                status="paid",
                                cycle_number=closing_cycle_number,
                                is_forced_settlement=True,
                                resolved_at=timezone.now(),
                            )
                    else:
                        self.stdout.write(
                            f"  -> marketer #{marketer.id} ({marketer.user.email}): "
                            f"closing cycle {closing_cycle_number}, "
                            f"no balance to settle"
                        )

                    # Mutate in-memory regardless of dry_run, so the while
                    # loop correctly advances through multiple missed cycles
                    # (get_cycle_end() reads these same in-memory attributes).
                    # Only .save() is gated on dry_run below.
                    marketer.monthly_profit_balance = Decimal("0")
                    marketer.monthly_completed_orders_count = 0
                    marketer.current_cycle_number += 1

                if touched:
                    marketers_touched += 1
                    if not dry_run:
                        marketer.save(
                            update_fields=[
                                "monthly_profit_balance",
                                "monthly_completed_orders_count",
                                "current_cycle_number",
                            ]
                        )

        prefix = "[DRY RUN] " if dry_run else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"{prefix}Done. Marketers with at least one closed cycle: "
                f"{marketers_touched}. Total cycles closed: {cycles_closed}. "
                f"Forced settlements created: {settlements_created} "
                f"(total {settled_total})."
            )
        )