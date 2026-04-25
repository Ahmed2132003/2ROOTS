from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.orders.models import Order, OrderItem
from .models import Invoice, InvoiceItem


@receiver(post_save, sender=Order)
def create_invoice_on_order(sender, instance, created, **kwargs):
    """
    لما Order جديدة تتعمل → اعمل Invoice draft تلقائياً
    مع snapshot من بيانات العميل والعناصر
    """
    if not created:
        return

    # تأكد مفيش invoice موجودة (لو اتعملت يدوياً)
    if hasattr(instance, 'invoice'):
        return

    invoice = Invoice.objects.create(
        order=instance,
        customer_name=instance.shipping_name,
        customer_phone=instance.shipping_phone,
        customer_address=instance.shipping_address,
        customer_email=instance.customer.email if instance.customer else '',
        subtotal=instance.total,
        total=instance.total,
    )

    # نسخ عناصر الأوردر للفاتورة
    for item in instance.items.all():
        InvoiceItem.objects.create(
            invoice=invoice,
            product_name=item.product_name,
            variant_name=item.variant_name,
            unit_price=item.price_at_order,
            quantity=item.quantity,
        )


@receiver(post_save, sender=OrderItem)
def update_invoice_on_item_add(sender, instance, created, **kwargs):
    """لما item يتضاف للأوردر → حدّث الـ Invoice"""
    if not created:
        return

    try:
        invoice = instance.order.invoice
        invoice.calculate_totals()
    except Invoice.DoesNotExist:
        pass