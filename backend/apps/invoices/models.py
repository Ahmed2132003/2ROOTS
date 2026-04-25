from django.db import models
from django.conf import settings
from apps.orders.models import Order
import uuid


class Invoice(models.Model):

    STATUS_CHOICES = (
        ('draft',  'Draft'),    # اتعملت تلقائي مع الأوردر — لسه متأكدتش
        ('issued', 'Issued'),   # اتأكدت ورقمها اتحجز
        ('paid',   'Paid'),     # اتدفعت (Cash on Delivery)
        ('void',   'Void'),     # اتلغت
    )

    order          = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    invoice_number = models.CharField(max_length=50, unique=True, blank=True)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # Snapshot من بيانات العميل وقت الفاتورة
    customer_name    = models.CharField(max_length=200)
    customer_phone   = models.CharField(max_length=20)
    customer_address = models.TextField()
    customer_email   = models.EmailField(blank=True)

    subtotal      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax           = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total         = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    notes         = models.TextField(blank=True)
    issued_at     = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def generate_invoice_number(self):
        """INV-2025-00042 مثلاً"""
        from django.utils import timezone
        year  = timezone.now().year
        count = Invoice.objects.filter(created_at__year=year).count() + 1
        return f"INV-{year}-{count:05d}"

    def calculate_totals(self):
        self.subtotal = sum(
            item.price_at_order * item.quantity
            for item in self.order.items.all()
        )
        self.total = self.subtotal - self.discount + self.tax
        self.save(update_fields=['subtotal', 'total'])

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = self.generate_invoice_number()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_number} — {self.customer_name}"


class InvoiceItem(models.Model):
    """
    نسخة مستقلة من عناصر الأوردر داخل الفاتورة
    لأن الفاتورة وثيقة قانونية — لازم تبقى ثابتة
    """
    invoice      = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    product_name = models.CharField(max_length=200)
    variant_name = models.CharField(max_length=100)
    unit_price   = models.DecimalField(max_digits=10, decimal_places=2)
    quantity     = models.PositiveIntegerField(default=1)

    @property
    def subtotal(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f"{self.product_name} × {self.quantity}"