from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.orders.models import Order
from apps.users.models import CustomerAccount


class Command(BaseCommand):
    help = "Backfill/link CustomerAccount records from existing orders"

    def handle(self, *args, **options):
        User = get_user_model()
        created_count = 0
        linked_count = 0
        skipped_count = 0

        for order in Order.objects.all().iterator():
            email = (order.shipping_email or '').strip().lower()
            if not email:
                skipped_count += 1
                continue

            if User.objects.filter(email__iexact=email).filter(is_staff=True).exists() or User.objects.filter(email__iexact=email).filter(is_superuser=True).exists():
                skipped_count += 1
                continue

            customer_account, created = CustomerAccount.objects.get_or_create(
                email=email,
                defaults={
                    'name': order.shipping_name,
                    'phone': order.shipping_phone,
                    'address': order.shipping_address,
                }
            )
            if created:
                created_count += 1

            if order.customer_account_id != customer_account.id:
                order.customer_account = customer_account
                order.save(update_fields=['customer_account'])
                linked_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done. created={created_count}, linked={linked_count}, skipped={skipped_count}"
        ))