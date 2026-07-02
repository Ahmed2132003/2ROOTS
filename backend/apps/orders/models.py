# apps/orders/models.py
from django.db import models
from django.conf import settings
from apps.products.models import ProductVariant
from apps.users.models import CustomerAccount


class ShippingRegion(models.Model):
    name = models.CharField(max_length=120, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.price} EGP)"


class Order(models.Model):

    STATUS_CHOICES = (
        ('pending',   'Pending'),      # الطلب اتعمل — لسه متأكدش
        ('confirmed', 'Confirmed'),    # اتأكد من الـ Staff
        ('shipped',   'Shipped'),      # اتشحن
        ('delivered', 'Delivered'),    # وصل للعميل
        ('cancelled', 'Cancelled'),    # اتلغى
    )

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='orders'
    )
    customer_account = models.ForeignKey(
        CustomerAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )

    # ── Marketers integration ───────────────────────────────────────────────
    # لو الأوردر ده أصله أوردر مسوق (apps.marketers.MarketerOrder)، بنعلّمه هنا
    # عشان يستفيد تلقائيًا من كل نظام الأوردرات العادي (داشبورد/فواتير/شحن)
    # من غير ما نكرر منطق منفصل. راجع apps/marketers/models.py (MarketerOrder.linked_order)
    # وapps/marketers/signals.py (auto-confirm عند delivered).
    is_marketer_order = models.BooleanField(default=False, db_index=True)
    marketer = models.ForeignKey(
        'marketers.Marketer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_orders',
    )

    # Snapshot من بيانات العميل وقت الطلب
    # (لأن العميل ممكن يغير بياناته بعدين)
    shipping_name    = models.CharField(max_length=200)
    shipping_email   = models.EmailField(max_length=254, blank=True, default='')
    shipping_phone   = models.CharField(max_length=20)    
    shipping_address = models.TextField()
    shipping_region  = models.CharField(max_length=120, blank=True)
    shipping_fee     = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes      = models.TextField(blank=True)   # ملاحظات العميل على الطلب
    total      = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def calculate_total(self):
        """إعادة حساب الـ total من الـ items"""
        items_total = sum(item.subtotal for item in self.items.all())
        self.total = items_total + self.shipping_fee
        self.save(update_fields=['total'])

    def __str__(self):
        return f"Order #{self.id} — {self.customer} — {self.status}"


class OrderItem(models.Model):
    order   = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True)

    # Snapshot من بيانات المنتج وقت الطلب
    # (المنتج ممكن يتحذف أو يتغير سعره بعدين)
    product_name    = models.CharField(max_length=200)
    variant_name    = models.CharField(max_length=100)
    price_at_order  = models.DecimalField(max_digits=10, decimal_places=2)
    quantity        = models.PositiveIntegerField(default=1)

    @property
    def subtotal(self):
        return self.price_at_order * self.quantity

    def __str__(self):
        return f"{self.product_name} × {self.quantity}"


class OrderStatusHistory(models.Model):
    """سجل كل تغيير في الـ status — مين غيره وامتى"""
    order      = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True
    )
    note       = models.TextField(blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-changed_at']

    def __str__(self):
        return f"Order #{self.order.id}: {self.old_status} → {self.new_status}"