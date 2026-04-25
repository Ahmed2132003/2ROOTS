from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, CustomerProfile


@receiver(post_save, sender=User)
def create_customer_profile(sender, instance, created, **kwargs):
    """لما user جديد اتعمل وهو customer، اعمله Profile تلقائي"""
    if created and instance.role == 'customer':
        CustomerProfile.objects.create(user=instance)