from django.db.models.signals import pre_save
from django.dispatch import receiver
from .models import Order, OrderStatusHistory


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