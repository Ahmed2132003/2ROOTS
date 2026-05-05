from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from apps.users.models import CustomerAccount
from .models import Order, OrderStatusHistory

User = get_user_model()


@receiver(pre_save, sender=Order)
def track_status_change(sender, instance, **kwargs):
    """لما الـ status يتغير، سجّل في الـ History تلقائياً"""
    if not instance.pk:
        return  # Order جديدة — مفيش old status

    try:
        old = Order.objects.get(pk=instance.pk)
    except Order.DoesNotExist:
        return

    if old.status != instance.status:
        OrderStatusHistory.objects.create(
            order=instance,
            old_status=old.status,
            new_status=instance.status,
        )


@receiver(post_save, sender=Order)
def sync_customer_account_from_order(sender, instance, **kwargs):
    email = (instance.shipping_email or '').strip().lower()
    if not email:
        return

    if User.objects.filter(email__iexact=email).filter(is_staff=True).exists():
        return
    if User.objects.filter(email__iexact=email).filter(is_superuser=True).exists():
        return

    customer_account, _ = CustomerAccount.objects.get_or_create(
        email=email,
        defaults={
            'name': instance.shipping_name,
            'phone': instance.shipping_phone,
            'address': instance.shipping_address,
        }
    )

    if instance.customer_account_id != customer_account.id:
        Order.objects.filter(pk=instance.pk).update(customer_account=customer_account)