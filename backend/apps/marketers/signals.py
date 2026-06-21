"""
apps/marketers/signals.py

Signal: لما يتعمل Marketer جديد، تأكد إن cycle_anchor_date اتضبط صح.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Marketer


@receiver(post_save, sender=Marketer)
def ensure_cycle_anchor(sender, instance, created, **kwargs):
    """
    لو اتعمل Marketer جديد وعنده cycle_anchor_date فاضي (حالة نادرة)،
    يُعبّأ بتاريخ اليوم تلقائياً.
    """
    if created and not instance.cycle_anchor_date:
        Marketer.objects.filter(pk=instance.pk).update(
            cycle_anchor_date=timezone.localdate()
        )