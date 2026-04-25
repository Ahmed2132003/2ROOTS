from django.db import models
from django.conf import settings
from apps.products.models import ProductVariant


class Cart(models.Model):
    """
    كل customer عنده cart واحدة بس — OneToOne مع الـ User
    لو الـ customer مش logged in → session_key
    """
    user        = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        null=True, blank=True, related_name='cart'
    )
    session_key = models.CharField(max_length=100, null=True, blank=True)  # للـ guests
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # مينفعش يبقى فيه cart بدون user ولا session_key
            models.CheckConstraint(
                check=(
                    models.Q(user__isnull=False) |
                    models.Q(session_key__isnull=False)
                ),
                name='cart_must_have_user_or_session'
            )
        ]

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())

    @property
    def total_price(self):
        return sum(item.subtotal for item in self.items.all())

    @property
    def is_empty(self):
        return not self.items.exists()

    def clear(self):
        """فراغ الـ Cart بعد إتمام الأوردر"""
        self.items.all().delete()

    def __str__(self):
        owner = self.user.email if self.user else f"Guest ({self.session_key})"
        return f"Cart — {owner} — {self.total_items} items"


class CartItem(models.Model):
    cart     = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    variant  = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # نفس الـ variant ميتكررش في نفس الـ cart
        unique_together = ['cart', 'variant']
        ordering = ['added_at']

    @property
    def subtotal(self):
        return self.variant.price * self.quantity

    @property
    def is_available(self):
        """تأكد إن الكمية المطلوبة موجودة في الـ Stock"""
        try:
            return self.variant.stock.quantity >= self.quantity
        except Exception:
            return False

    def __str__(self):
        return f"{self.variant} × {self.quantity}"