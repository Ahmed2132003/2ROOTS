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