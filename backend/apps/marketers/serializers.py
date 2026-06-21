from rest_framework import serializers
from .models import (
    Marketer,
    MarketerProductPrice,
    MarketerOrder,
    RewardTier,
    TeamReward,
    TeamLeaderRequest,
    TeamLeaderRequestMember,
    WithdrawalRequest,
)


# ── Marketer ──────────────────────────────────────────────────────────────────
class MarketerSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model  = Marketer
        fields = [
            'id', 'email', 'username', 'referral_code',
            'status', 'role',
            'team_leader', 'credited_team_leader',
            'cycle_anchor_date', 'current_cycle_number',
            'monthly_completed_orders_count', 'monthly_profit_balance',
            'lifetime_total_orders', 'lifetime_total_profit',
            'created_at', 'promoted_to_leader_at',
        ]
        read_only_fields = [
            'id', 'email', 'username', 'referral_code',
            'cycle_anchor_date', 'current_cycle_number',
            'monthly_completed_orders_count', 'monthly_profit_balance',
            'lifetime_total_orders', 'lifetime_total_profit',
            'created_at', 'promoted_to_leader_at',
            'credited_team_leader',
        ]


# ── MarketerProductPrice ──────────────────────────────────────────────────────
class MarketerProductPriceSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model  = MarketerProductPrice
        fields = ['id', 'marketer', 'product', 'product_name', 'assigned_price', 'updated_at']
        read_only_fields = ['id', 'updated_at', 'product_name']


# ── MarketerOrder ─────────────────────────────────────────────────────────────
class MarketerOrderSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    marketer_email = serializers.EmailField(source='marketer.user.email', read_only=True)

    class Meta:
        model  = MarketerOrder
        fields = [
            'id', 'marketer', 'marketer_email',
            'product', 'product_name',
            'quantity', 'sale_price_per_unit',
            'assigned_price_per_unit', 'profit_amount',
            'customer_name', 'customer_phone',
            'status', 'is_counted', 'counted_in_cycle_number',
            'created_at', 'confirmed_at',
        ]
        read_only_fields = [
            'id', 'marketer', 'marketer_email', 'product_name',
            'assigned_price_per_unit', 'profit_amount',
            'is_counted', 'counted_in_cycle_number',
            'created_at', 'confirmed_at', 'status',
        ]


class MarketerOrderCreateSerializer(serializers.ModelSerializer):
    """للمسوق عند تسجيل أوردر جديد — Part A2"""
    class Meta:
        model  = MarketerOrder
        fields = ['product', 'quantity', 'sale_price_per_unit',
                  'customer_name', 'customer_phone']

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("الكمية لازم تكون أكبر من صفر.")
        return value

    def validate_sale_price_per_unit(self, value):
        if value <= 0:
            raise serializers.ValidationError("سعر البيع لازم يكون أكبر من صفر.")
        return value


# ── RewardTier ────────────────────────────────────────────────────────────────
class RewardTierSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RewardTier
        fields = ['id', 'min_team_sales', 'reward_amount', 'is_active']


# ── TeamReward ────────────────────────────────────────────────────────────────
class TeamRewardSerializer(serializers.ModelSerializer):
    marketer_email = serializers.EmailField(source='marketer.user.email', read_only=True)
    tier_details   = RewardTierSerializer(source='tier', read_only=True)

    class Meta:
        model  = TeamReward
        fields = [
            'id', 'marketer', 'marketer_email',
            'tier', 'tier_details',
            'cycle_number', 'team_sales_count_at_award',
            'reward_amount', 'status', 'created_at',
        ]
        read_only_fields = [
            'id', 'marketer_email', 'tier_details',
            'cycle_number', 'team_sales_count_at_award',
            'reward_amount', 'created_at',
        ]


# ── TeamLeaderRequest ─────────────────────────────────────────────────────────
class TeamLeaderRequestSerializer(serializers.ModelSerializer):
    marketer_email = serializers.EmailField(source='marketer.user.email', read_only=True)
    members_count  = serializers.IntegerField(source='members.count', read_only=True)

    class Meta:
        model  = TeamLeaderRequest
        fields = [
            'id', 'marketer', 'marketer_email',
            'status', 'triggered_at', 'responded_at',
            'members_count',
        ]
        read_only_fields = ['id', 'marketer_email', 'triggered_at', 'members_count']


class TeamLeaderRequestMemberSerializer(serializers.ModelSerializer):
    marketer_email = serializers.EmailField(source='marketer.user.email', read_only=True)

    class Meta:
        model  = TeamLeaderRequestMember
        fields = ['id', 'request', 'marketer', 'marketer_email']
        read_only_fields = ['id', 'marketer_email']


# ── WithdrawalRequest ─────────────────────────────────────────────────────────
class WithdrawalRequestSerializer(serializers.ModelSerializer):
    marketer_email = serializers.EmailField(source='marketer.user.email', read_only=True)

    class Meta:
        model  = WithdrawalRequest
        fields = [
            'id', 'marketer', 'marketer_email',
            'amount', 'status', 'cycle_number',
            'created_at', 'resolved_at',
        ]
        read_only_fields = [
            'id', 'marketer_email', 'cycle_number',
            'created_at', 'resolved_at',
        ]



# ─────────────────────────────────────────────────────────────────────────────
# MarketerOrder — Create (يستخدمه المسوق لتسجيل أوردر جديد)
# ─────────────────────────────────────────────────────────────────────────────
class MarketerOrderCreateSerializer(serializers.ModelSerializer):
    """
    POST /api/marketers/me/orders/

    - يجيب MarketerProductPrice الخاص بالمسوق+المنتج، ولو غير موجود يرفض بوضوح.
    - assigned_price_per_unit = snapshot من السعر الحالي وقت التسجيل.
    - profit_amount = (sale_price_per_unit - assigned_price_per_unit) * quantity.
    """
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = MarketerOrder
        fields = [
            'id', 'product_id', 'quantity', 'sale_price_per_unit',
            'customer_name', 'customer_phone',
            # read-only output (تُحسب في create، الكلاينت مش بيبعتها)
            'assigned_price_per_unit', 'profit_amount', 'status', 'created_at',
        ]
        read_only_fields = [
            'id', 'assigned_price_per_unit', 'profit_amount', 'status', 'created_at',
        ]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("الكمية يجب أن تكون أكبر من صفر.")
        return value

    def validate_sale_price_per_unit(self, value):
        if value <= 0:
            raise serializers.ValidationError("سعر البيع يجب أن يكون أكبر من صفر.")
        return value

    def validate(self, attrs):
        request = self.context['request']
        marketer = request.user.marketer_profile
        product_id = attrs.get('product_id')

        price_entry = (
            MarketerProductPrice.objects
            .filter(marketer=marketer, product_id=product_id)
            .first()
        )
        if not price_entry:
            raise serializers.ValidationError({
                'product_id': "مفيش سعر محدد لك على هذا المنتج، تواصل مع الإدارة."
            })

        # نمررهم لـ create() بدون لمس attrs الأصلية اللي هتروح لـ ModelSerializer
        attrs['_marketer'] = marketer
        attrs['_price_entry'] = price_entry
        return attrs

    def create(self, validated_data):
        marketer = validated_data.pop('_marketer')
        price_entry = validated_data.pop('_price_entry')
        product_id = validated_data.pop('product_id')

        quantity = validated_data['quantity']
        sale_price_per_unit = validated_data['sale_price_per_unit']
        assigned_price_per_unit = price_entry.assigned_price
        profit_amount = (sale_price_per_unit - assigned_price_per_unit) * quantity

        return MarketerOrder.objects.create(
            marketer=marketer,
            product_id=product_id,
            quantity=quantity,
            sale_price_per_unit=sale_price_per_unit,
            assigned_price_per_unit=assigned_price_per_unit,
            profit_amount=profit_amount,
            customer_name=validated_data['customer_name'],
            customer_phone=validated_data['customer_phone'],
            status='pending',
        )


# ─────────────────────────────────────────────────────────────────────────────
# MarketerOrder — Read (لقوائم الأدمن، ولاحقًا للمسوق في A8)
# ─────────────────────────────────────────────────────────────────────────────
class MarketerOrderSerializer(serializers.ModelSerializer):
    marketer_email = serializers.CharField(source='marketer.user.email', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True, default=None)

    class Meta:
        model = MarketerOrder
        fields = [
            'id', 'marketer', 'marketer_email', 'product', 'product_name',
            'quantity', 'sale_price_per_unit', 'assigned_price_per_unit',
            'profit_amount', 'customer_name', 'customer_phone',
            'status', 'is_counted', 'counted_in_cycle_number',
            'counted_towards_leader', 'created_at', 'confirmed_at',
        ]
        read_only_fields = fields