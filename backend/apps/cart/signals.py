from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Cart


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_cart_for_customer(sender, instance, created, **kwargs):
    """لما customer جديد يتسجل → اعمله Cart فاضية تلقائياً"""
    if created and instance.role == 'customer':
        Cart.objects.get_or_create(user=instance)