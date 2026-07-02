import uuid
from decimal import Decimal

from django.db import models
from django.conf import settings
from django.utils import timezone


def _generate_referral_code():
    return uuid.uuid4().hex[:8].upper()


# ─────────────────────────────────────────────────────────────────────────────
# 1. Marketer
# ─────────────────────────────────────────────────────────────────────────────
class Marketer(models.Model):
    STATUS_CHOICES = (
        ('active',     'Active'),
        ('suspended',  'Suspended'),
    )
    ROLE_CHOICES = (
        ('marketer',     'Marketer'),
        ('team_leader',  'Team Leader'),
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='marketer_profile',
    )

    referral_code = models.CharField(
        max_length=20, unique=True, default=_generate_referral_code,
        db_index=True,
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='active', db_index=True,
    )
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default='marketer', db_index=True,
    )

    team_leader = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='team_members',
    )
    credited_team_leader = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='credited_members',
    )

    cycle_anchor_date = models.DateField()
    current_cycle_number = models.PositiveIntegerField(default=0)

    monthly_completed_orders_count = models.PositiveIntegerField(default=0)
    monthly_profit_balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
    )

    lifetime_total_orders = models.PositiveIntegerField(default=0)
    lifetime_total_profit = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    promoted_to_leader_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Marketer'
        verbose_name_plural = 'Marketers'

    def save(self, *args, **kwargs):
        if not self.pk and not self.cycle_anchor_date:
            self.cycle_anchor_date = timezone.localdate()
        super().save(*args, **kwargs)

    def get_cycle_start(self, cycle_number=None):
        from datetime import timedelta
        n = cycle_number if cycle_number is not None else self.current_cycle_number
        return self.cycle_anchor_date + timedelta(days=settings.MARKETER_CYCLE_DAYS * n)

    def get_cycle_end(self, cycle_number=None):
        from datetime import timedelta
        n = cycle_number if cycle_number is not None else self.current_cycle_number
        return self.cycle_anchor_date + timedelta(
            days=settings.MARKETER_CYCLE_DAYS * (n + 1)
        )

    def get_team_sales_for_current_cycle(self):
        window_start = self.get_cycle_start()
        window_end = self.get_cycle_end()

        qs = self.team_sales_orders.filter(
            is_counted=True,
            confirmed_at__date__gte=window_start,
            confirmed_at__date__lt=window_end,
        )
        agg = qs.aggregate(
            orders_count=models.Count('id'),
            total_profit=models.Sum('profit_amount'),
        )
        return {
            'orders_count': agg['orders_count'] or 0,
            'total_profit': agg['total_profit'] or Decimal('0'),
        }

    def __str__(self):
        return f"Marketer({self.user.email}) — {self.role} — {self.status}"


# ─────────────────────────────────────────────────────────────────────────────
# 2. MarketerProductPrice
# ─────────────────────────────────────────────────────────────────────────────
class MarketerProductPrice(models.Model):
    marketer = models.ForeignKey(
        Marketer,
        on_delete=models.CASCADE,
        related_name='product_prices',
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        related_name='marketer_prices',
    )
    assigned_price = models.DecimalField(max_digits=10, decimal_places=2)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('marketer', 'product')]
        verbose_name = 'Marketer Product Price'
        verbose_name_plural = 'Marketer Product Prices'

    def __str__(self):
        return (
            f"{self.marketer.user.email} | {self.product.name} "
            f"→ {self.assigned_price} EGP"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 3. MarketerOrder
# ─────────────────────────────────────────────────────────────────────────────
class MarketerOrder(models.Model):
    """
    أوردر يسجّله المسوق بنفسه (بيع شخصي يدوي).

    ⚠️ تحديث (دعم أسطر متعددة): الأوردر بقى ممكن يحتوي على أكتر من سطر
    منتج (راجع MarketerOrderItem تحت). الحقول القديمة هنا (product,
    variant, quantity, sale_price_per_unit, assigned_price_per_unit)
    بقت nullable عشان تفضل تشتغل بالظبط زي الأول لأي أوردر قديم بسطر
    واحد (مفيش أي تعديل على بياناتهم التاريخية)، وبيتسيبوا فاضيين
    (None) للأوردرات الجديدة اللي فيها أكتر من سطر — البيانات الحقيقية
    بتاعتهم موجودة في .items.all(). profit_amount و quantity (لو
    multi-item) بيفضلوا مُحدَّثين دايماً كـ aggregate (مجموع كل
    الأسطر) عشان أي كود قديم بيعتمد عليهم مباشرة (زي
    get_team_sales_for_current_cycle) يفضل شغال صح من غير أي تعديل.
    """
    STATUS_CHOICES = (
        ('pending',   'Pending'),
        ('confirmed', 'Confirmed'),
        ('rejected',  'Rejected'),
    )

    marketer = models.ForeignKey(
        Marketer,
        on_delete=models.CASCADE,
        related_name='orders',
    )
    # ⚠️ nullable الآن — فاضي لأوردرات multi-item الجديدة (راجع شرح الكلاس)
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='marketer_orders',
    )
    variant = models.ForeignKey(
        'products.ProductVariant',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='marketer_orders',
    )

    # ⚠️ nullable الآن — راجع شرح الكلاس أعلاه
    quantity = models.PositiveIntegerField(null=True, blank=True)
    sale_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    assigned_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # الربح الإجمالي — دايماً متحسوب (مجموع كل الأسطر لو multi-item)
    profit_amount = models.DecimalField(max_digits=10, decimal_places=2)

    customer_name  = models.CharField(max_length=200)
    customer_phone = models.CharField(max_length=30)

    shipping_region = models.ForeignKey(
        'orders.ShippingRegion',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='marketer_orders',
    )
    shipping_address = models.TextField(blank=True, default='')
    linked_order = models.OneToOneField(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='marketer_order_source',
    )

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True,
    )
    is_counted = models.BooleanField(default=False)
    counted_in_cycle_number = models.IntegerField(null=True, blank=True)

    counted_towards_leader = models.ForeignKey(
        Marketer,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='team_sales_orders',
    )

    created_at   = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Marketer Order'
        verbose_name_plural = 'Marketer Orders'

    @property
    def is_multi_item(self):
        return self.items.count() > 1

    def __str__(self):
        return (
            f"MOrder#{self.pk} | {self.marketer.user.email} | "
            f"{self.product.name if self.product else 'multi-item'} | "
            f"{self.status}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 3b. MarketerOrderItem  (جديد — يدعم تعدد الأسطر في أوردر المسوق)
# ─────────────────────────────────────────────────────────────────────────────
class MarketerOrderItem(models.Model):
    """
    سطر واحد داخل MarketerOrder — منتج معين بـ variant (لون/مقاس) وكمية
    وسعر بيع. كل أوردر مسوق جديد فيه سطر واحد على الأقل، ممكن يكون أكتر.
    """
    order = models.ForeignKey(
        MarketerOrder,
        on_delete=models.CASCADE,
        related_name='items',
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        related_name='marketer_order_items',
    )
    variant = models.ForeignKey(
        'products.ProductVariant',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='marketer_order_items',
    )
    quantity = models.PositiveIntegerField()
    sale_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    # Snapshot من MarketerProductPrice وقت التسجيل
    assigned_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    profit_amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Marketer Order Item'
        verbose_name_plural = 'Marketer Order Items'

    @property
    def subtotal(self):
        return self.sale_price_per_unit * self.quantity

    def __str__(self):
        return f"{self.product.name if self.product else 'N/A'} × {self.quantity}"


# ─────────────────────────────────────────────────────────────────────────────
# 4. RewardTier
# ─────────────────────────────────────────────────────────────────────────────
class RewardTier(models.Model):
    min_team_sales = models.PositiveIntegerField()
    reward_amount  = models.DecimalField(max_digits=10, decimal_places=2)
    is_active      = models.BooleanField(default=True)

    class Meta:
        ordering = ['min_team_sales']
        verbose_name = 'Reward Tier'
        verbose_name_plural = 'Reward Tiers'

    def __str__(self):
        return (
            f"RewardTier: ≥{self.min_team_sales} sales → "
            f"{self.reward_amount} EGP ({'active' if self.is_active else 'inactive'})"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 5. TeamReward
# ─────────────────────────────────────────────────────────────────────────────
class TeamReward(models.Model):
    STATUS_CHOICES = (
        ('pending',  'Pending'),
        ('approved', 'Approved'),
        ('paid',     'Paid'),
    )

    marketer   = models.ForeignKey(
        Marketer,
        on_delete=models.CASCADE,
        related_name='team_rewards',
        limit_choices_to={'role': 'team_leader'},
    )
    tier = models.ForeignKey(
        RewardTier,
        on_delete=models.SET_NULL,
        null=True,
        related_name='team_rewards',
    )
    cycle_number = models.PositiveIntegerField()
    team_sales_count_at_award = models.PositiveIntegerField()
    reward_amount = models.DecimalField(max_digits=10, decimal_places=2)

    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = [('marketer', 'tier', 'cycle_number')]
        verbose_name = 'Team Reward'
        verbose_name_plural = 'Team Rewards'

    def __str__(self):
        return (
            f"TeamReward | {self.marketer.user.email} | "
            f"Cycle {self.cycle_number} | {self.reward_amount} EGP | {self.status}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 6. TeamLeaderRequest
# ─────────────────────────────────────────────────────────────────────────────
class TeamLeaderRequest(models.Model):
    STATUS_CHOICES = (
        ('awaiting_response',          'Awaiting Response'),
        ('accepted_pending_requirement', 'Accepted – Pending Requirement'),
        ('completed',                  'Completed'),
        ('declined',                   'Declined'),
        ('cancelled',                  'Cancelled'),
    )

    marketer     = models.ForeignKey(
        Marketer,
        on_delete=models.CASCADE,
        related_name='leader_requests',
    )
    status       = models.CharField(
        max_length=40, choices=STATUS_CHOICES, default='awaiting_response',
    )
    triggered_at = models.DateTimeField(default=timezone.now)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-triggered_at']
        verbose_name = 'Team Leader Request'
        verbose_name_plural = 'Team Leader Requests'

    def __str__(self):
        return (
            f"TLRequest#{self.pk} | {self.marketer.user.email} | {self.status}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 7. TeamLeaderRequestMember
# ─────────────────────────────────────────────────────────────────────────────
class TeamLeaderRequestMember(models.Model):
    """
    ⚠️ تحديث (دعوات الانضمام): بقى فيه دورة حياة حقيقية للترشيح بدل
    ما يتضاف المسوّق مباشرة. status='pending' يعني "دعوة اتبعتت لسه
    منتظرة رد". status='accepted' يعني وافق فعليًا (بيتحسب من الـ10
    المطلوبين). status='declined' يعني رفض (ما بيتحسبش، والقائد لازم
    يرشّح حد بدله — راجع MyTeamLeaderRequestNominateView وMyTeamInvitationRespondView
    في views.py).
    """
    STATUS_CHOICES = (
        ('pending',  'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    )

    request  = models.ForeignKey(
        TeamLeaderRequest,
        on_delete=models.CASCADE,
        related_name='members',
    )
    marketer = models.ForeignKey(
        Marketer,
        on_delete=models.CASCADE,
        related_name='leader_request_nominations',
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True,
    )
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('request', 'marketer')]
        verbose_name = 'Team Leader Request Member'
        verbose_name_plural = 'Team Leader Request Members'

    def __str__(self):
        return f"TLMember | req#{self.request_id} | {self.marketer.user.email} | {self.status}"


# ─────────────────────────────────────────────────────────────────────────────
# 8. WithdrawalRequest
# ─────────────────────────────────────────────────────────────────────────────
class WithdrawalRequest(models.Model):
    STATUS_CHOICES = (
        ('pending',  'Pending'),
        ('approved', 'Approved'),
        ('paid',     'Paid'),
        ('rejected', 'Rejected'),
    )

    marketer     = models.ForeignKey(
        Marketer,
        on_delete=models.CASCADE,
        related_name='withdrawal_requests',
    )
    amount       = models.DecimalField(max_digits=10, decimal_places=2)
    status       = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending',
    )
    cycle_number = models.PositiveIntegerField()
    is_forced_settlement = models.BooleanField(default=False)

    created_at   = models.DateTimeField(auto_now_add=True)
    resolved_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Withdrawal Request'
        verbose_name_plural = 'Withdrawal Requests'

    def __str__(self):
        return (
            f"Withdrawal#{self.pk} | {self.marketer.user.email} | "
            f"{self.amount} EGP | {self.status}"
        )