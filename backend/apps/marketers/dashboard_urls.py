from django.urls import path

from .dashboard_views import (
    # A2 (moved)
    AdminMarketerOrderListView,
    AdminMarketerOrderConfirmView,
    AdminMarketerOrderRejectView,
    # A4 (moved)
    AdminPromoteToLeaderView,
    # A5 (moved)
    AdminEvaluateTeamRewardsView,
    # A6 (moved)
    AdminWithdrawalListView,
    AdminWithdrawalApproveView,
    AdminWithdrawalRejectView,
    # A7 (new) — تسعير
    AdminMarketerProductPriceListCreateView,
    AdminMarketerProductPriceDetailView,
    # A7 (new) — إدارة المسوقين
    AdminMarketerListView,
    AdminMarketerDetailView,
    # A7 (new) — المكافآت ودرجاتها
    AdminRewardTierListCreateView,
    AdminRewardTierDetailView,
    AdminTeamRewardListView,
    AdminTeamRewardUpdateView,
    # A7 (new) — طلبات الترقية (عرض/مراقبة)
    AdminTeamLeaderRequestListView,
)

app_name = 'marketers_dashboard'

urlpatterns = [
    # ── A2 (moved) — أوردرات المسوقين ────────────────────────────────────────
    path('marketer-orders/', AdminMarketerOrderListView.as_view(), name='order-list'),
    path('marketer-orders/<int:pk>/confirm/', AdminMarketerOrderConfirmView.as_view(), name='order-confirm'),
    path('marketer-orders/<int:pk>/reject/', AdminMarketerOrderRejectView.as_view(), name='order-reject'),

    # ── A7 (new) — التسعير لكل مسوق/منتج ─────────────────────────────────────
    # ⚠️ لازم تيجي قبل marketers/<int:pk>/ عشان مفيش تعارض في الـ matching
    path(
        'marketers/<int:marketer_id>/product-prices/',
        AdminMarketerProductPriceListCreateView.as_view(),
        name='marketer-product-price-list-create',
    ),
    path(
        'marketer-product-prices/<int:pk>/',
        AdminMarketerProductPriceDetailView.as_view(),
        name='marketer-product-price-detail',
    ),

    # ── A7 (new) — إدارة المسوقين ─────────────────────────────────────────────
    path('marketers/', AdminMarketerListView.as_view(), name='marketer-list'),
    path('marketers/<int:pk>/', AdminMarketerDetailView.as_view(), name='marketer-detail'),

    # ── A4 (moved) — ترقية يدوية ──────────────────────────────────────────────
    path('marketers/<int:pk>/promote-to-leader/', AdminPromoteToLeaderView.as_view(), name='promote-to-leader'),

    # ── A7 (new) — المكافآت ودرجاتها ──────────────────────────────────────────
    path('reward-tiers/', AdminRewardTierListCreateView.as_view(), name='reward-tier-list-create'),
    path('reward-tiers/<int:pk>/', AdminRewardTierDetailView.as_view(), name='reward-tier-detail'),

    # ── A5 (moved) — تقييم المكافآت يدويًا ────────────────────────────────────
    path('team-rewards/evaluate/', AdminEvaluateTeamRewardsView.as_view(), name='team-rewards-evaluate'),

    # ── A7 (new) — قائمة/تحديث مكافآت القادة ──────────────────────────────────
    path('team-rewards/', AdminTeamRewardListView.as_view(), name='team-reward-list'),
    path('team-rewards/<int:pk>/', AdminTeamRewardUpdateView.as_view(), name='team-reward-update'),

    # ── A6 (moved) — طلبات السحب ──────────────────────────────────────────────
    path('withdrawals/', AdminWithdrawalListView.as_view(), name='withdrawal-list'),
    path('withdrawals/<int:pk>/approve/', AdminWithdrawalApproveView.as_view(), name='withdrawal-approve'),
    path('withdrawals/<int:pk>/reject/', AdminWithdrawalRejectView.as_view(), name='withdrawal-reject'),

    # ── A7 (new) — طلبات الترقية (عرض/مراقبة فقط) ─────────────────────────────
    path('team-leader-requests/', AdminTeamLeaderRequestListView.as_view(), name='team-leader-request-list'),
]