from django.contrib import admin
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


@admin.register(Marketer)
class MarketerAdmin(admin.ModelAdmin):
    list_display  = ['user', 'role', 'status', 'referral_code',
                     'monthly_completed_orders_count', 'monthly_profit_balance',
                     'current_cycle_number', 'created_at']
    list_filter   = ['role', 'status']
    search_fields = ['user__email', 'referral_code']
    raw_id_fields = ['user', 'team_leader', 'credited_team_leader']
    readonly_fields = ['referral_code', 'cycle_anchor_date', 'created_at', 'promoted_to_leader_at']


@admin.register(MarketerProductPrice)
class MarketerProductPriceAdmin(admin.ModelAdmin):
    list_display  = ['marketer', 'product', 'assigned_price', 'updated_at']
    search_fields = ['marketer__user__email', 'product__name']
    raw_id_fields = ['marketer', 'product']


@admin.register(MarketerOrder)
class MarketerOrderAdmin(admin.ModelAdmin):
    list_display  = ['id', 'marketer', 'product', 'quantity',
                     'sale_price_per_unit', 'profit_amount', 'status',
                     'is_counted', 'created_at']
    list_filter   = ['status', 'is_counted']
    search_fields = ['marketer__user__email', 'customer_name', 'customer_phone']
    raw_id_fields = ['marketer', 'product', 'counted_towards_leader']
    readonly_fields = ['profit_amount', 'assigned_price_per_unit',
                       'is_counted', 'counted_in_cycle_number', 'confirmed_at']


@admin.register(RewardTier)
class RewardTierAdmin(admin.ModelAdmin):
    list_display = ['min_team_sales', 'reward_amount', 'is_active']
    list_editable = ['is_active']


@admin.register(TeamReward)
class TeamRewardAdmin(admin.ModelAdmin):
    list_display  = ['marketer', 'tier', 'cycle_number',
                     'reward_amount', 'status', 'created_at']
    list_filter   = ['status']
    raw_id_fields = ['marketer', 'tier']


@admin.register(TeamLeaderRequest)
class TeamLeaderRequestAdmin(admin.ModelAdmin):
    list_display  = ['marketer', 'status', 'triggered_at', 'responded_at']
    list_filter   = ['status']
    raw_id_fields = ['marketer']


@admin.register(TeamLeaderRequestMember)
class TeamLeaderRequestMemberAdmin(admin.ModelAdmin):
    list_display  = ['request', 'marketer']
    raw_id_fields = ['request', 'marketer']


@admin.register(WithdrawalRequest)
class WithdrawalRequestAdmin(admin.ModelAdmin):
    list_display  = ['marketer', 'amount', 'status', 'cycle_number', 'created_at']
    list_filter   = ['status']
    raw_id_fields = ['marketer']