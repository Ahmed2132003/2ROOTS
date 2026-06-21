import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


def _generate_referral_code():
    """يولّد كود فريد من 8 حروف كبيرة/أرقام"""
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

    # ── Identity ──────────────────────────────────────────────────────────────
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

    # ── Team relations ────────────────────────────────────────────────────────
    # مين القائد الحالي للمسوق ده (قابل للتغيير)
    team_leader = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='team_members',
    )
    # القائد المُحتسَب له أرباح مبيعاته الشخصية بعد ترقيته — يُسجَّل مرة واحدة ولا يتغير
    credited_team_leader = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='credited_members',
    )

    # ── Cycle tracking ────────────────────────────────────────────────────────
    # تاريخ بداية أول دورة = تاريخ إنشاء الحساب، يُحفظ مرة واحدة
    cycle_anchor_date = models.DateField()
    # رقم الدورة الحالية (يبدأ 0، يزيد كل 30 يوم)
    current_cycle_number = models.PositiveIntegerField(default=0)

    # ── Monthly counters (يُصفَّران كل دورة) ─────────────────────────────────
    monthly_completed_orders_count = models.PositiveIntegerField(default=0)
    monthly_profit_balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
    )

    # ── Lifetime counters (تراكمية، لا تُصفَّر أبداً) ────────────────────────
    lifetime_total_orders = models.PositiveIntegerField(default=0)
    lifetime_total_profit = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    promoted_to_leader_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Marketer'
        verbose_name_plural = 'Marketers'

    def save(self, *args, **kwargs):
        # cycle_anchor_date = تاريخ اليوم عند الإنشاء
        if not self.pk and not self.cycle_anchor_date:
            self.cycle_anchor_date = timezone.localdate()
        super().save(*args, **kwargs)

    def get_cycle_start(self, cycle_number=None):
        """يرجع تاريخ بداية دورة معينة (أو الحالية)."""
        from datetime import timedelta
        n = cycle_number if cycle_number is not None else self.current_cycle_number
        return self.cycle_anchor_date + timedelta(days=settings.MARKETER_CYCLE_DAYS * n)

    def get_cycle_end(self, cycle_number=None):
        """يرجع تاريخ نهاية دورة معينة (exclusive)."""
        from datetime import timedelta
        n = cycle_number if cycle_number is not None else self.current_cycle_number
        return self.cycle_anchor_date + timedelta(
            days=settings.MARKETER_CYCLE_DAYS * (n + 1)
        )

    def __str__(self):
        return f"Marketer({self.user.email}) — {self.role} — {self.status}"


# ─────────────────────────────────────────────────────────────────────────────
# 2. MarketerProductPrice
# ─────────────────────────────────────────────────────────────────────────────
class MarketerProductPrice(models.Model):
    """السعر (التكلفة) اللي الأدمن حدده لمسوق معين على منتج معين."""

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
    # التكلفة المحددة من الأدمن = "سعر شراء" المسوق
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

    قرار موثَّق: موديل منفصل تماماً عن apps.orders.Order لأن:
    - لا يمر بـ Cart ولا بدفع أونلاين
    - المسوق يدخل بيانات العميل والسعر يدوياً
    - لا علاقة له بـ invoices/shipping/CustomerAccount
    - snapshot المطلوب مختلف جوهرياً (سعر بيع + تكلفة + ربح)
    """
    STATUS_CHOICES = (
        ('pending',   'Pending'),    # في انتظار تأكيد الأدمن
        ('confirmed', 'Confirmed'),  # تم التأكيد — يُحتسب
        ('rejected',  'Rejected'),   # مرفوض — لا يُحتسب
    )

    marketer = models.ForeignKey(
        Marketer,
        on_delete=models.CASCADE,
        related_name='orders',
    )
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        related_name='marketer_orders',
    )

    # ── Order details ─────────────────────────────────────────────────────────
    quantity = models.PositiveIntegerField()
    # السعر اللي المسوق باع بيه الفعلي
    sale_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    # Snapshot من MarketerProductPrice وقت التسجيل (لا يتأثر بتغييرات لاحقة)
    assigned_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    # الربح = (سعر البيع - التكلفة) × الكمية — يُحسب عند الإنشاء
    profit_amount = models.DecimalField(max_digits=10, decimal_places=2)

    # ── Customer info (نص بسيط، بدون ربط بـ CustomerAccount) ─────────────────
    customer_name  = models.CharField(max_length=200)
    customer_phone = models.CharField(max_length=30)

    # ── Status & counting ─────────────────────────────────────────────────────
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True,
    )
    # True فقط بعد التأكيد
    is_counted = models.BooleanField(default=False)
    # رقم الدورة اللي اتحسب فيها (لاسترجاعها لو اتلغى التأكيد لاحقاً)
    counted_in_cycle_number = models.IntegerField(null=True, blank=True)

    # حقل يحدد "مبيعات مين" يُحتسب هذا الأوردر لصالحه (يُعبأ عند confirm)
    # لو المسوق كان team_leader وقت التأكيد → يروح لـ credited_team_leader بتاعه
    # لو كان marketer عادي → يروح لـ team_leader الحالي
    counted_towards_leader = models.ForeignKey(
        Marketer,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='team_sales_orders',
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at   = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Marketer Order'
        verbose_name_plural = 'Marketer Orders'

    def __str__(self):
        return (
            f"MOrder#{self.pk} | {self.marketer.user.email} | "
            f"{self.product.name if self.product else 'N/A'} ×{self.quantity} | "
            f"{self.status}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 4. RewardTier
# ─────────────────────────────────────────────────────────────────────────────
class RewardTier(models.Model):
    """درجة مكافأة Team Leader — قابلة للتعديل من الداشبورد."""

    # الحد الأدنى من مبيعات الفريق (عدد الأوردرات) للحصول على المكافأة
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
    """مكافأة حصل عليها Team Leader في دورة معينة."""

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
    # رقم دورة القائد اللي حصلت فيها المكافأة
    cycle_number = models.PositiveIntegerField()
    # Snapshots
    team_sales_count_at_award = models.PositiveIntegerField()
    reward_amount = models.DecimalField(max_digits=10, decimal_places=2)

    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        # قائد واحد لا يأخذ نفس الـ tier مرتين في نفس الدورة
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
    """
    طلب ترقية يُطرح على المسوق لما يحقق التارجت.
    المسوق يختار القبول/الرفض، ثم يكمل شرط الـ10 مسوقين.
    """
    STATUS_CHOICES = (
        ('awaiting_response',          'Awaiting Response'),        # بانتظار رد المسوق
        ('accepted_pending_requirement', 'Accepted – Pending Requirement'),  # قبل ولسه محتاج يكمل الشرط
        ('completed',                  'Completed'),                # اكتمل — تمت الترقية
        ('declined',                   'Declined'),                 # رفض المسوق
        ('cancelled',                  'Cancelled'),                # ألغاه النظام/الأدمن
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
    """المسوقون اللي رشّحهم المسوق لضمّهم لفريقه عند الترقية."""

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

    class Meta:
        unique_together = [('request', 'marketer')]
        verbose_name = 'Team Leader Request Member'
        verbose_name_plural = 'Team Leader Request Members'

    def __str__(self):
        return f"TLMember | req#{self.request_id} | {self.marketer.user.email}"


# ─────────────────────────────────────────────────────────────────────────────
# 8. WithdrawalRequest
# ─────────────────────────────────────────────────────────────────────────────
class WithdrawalRequest(models.Model):
    """طلب سحب أرباح من المسوق."""

    STATUS_CHOICES = (
        ('pending',  'Pending'),   # بانتظار موافقة الأدمن
        ('approved', 'Approved'),  # وافق الأدمن
        ('paid',     'Paid'),      # تم الدفع
        ('rejected', 'Rejected'),  # رُفض
    )

    marketer     = models.ForeignKey(
        Marketer,
        on_delete=models.CASCADE,
        related_name='withdrawal_requests',
    )
    # المبلغ المطلوب — يُخصم فوراً من monthly_profit_balance عند التقديم
    amount       = models.DecimalField(max_digits=10, decimal_places=2)
    status       = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='pending',
    )
    # رقم الدورة اللي طلب السحب فيها
    cycle_number = models.PositiveIntegerField()

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