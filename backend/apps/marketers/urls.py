from django.urls import path

from .views import (
    # A8
    MyMarketerDetailView,
    MyProductPricesListView,
    MyTeamMembersListView,
    MyTeamSalesSummaryView,
    MyTeamRewardsListView,
    # A2 + A8 (مدمجة)
    MyMarketerOrderListCreateView,
    # A4
    MyTeamLeaderRequestView,
    MyTeamLeaderRequestRespondView,
    AvailableForTeamView,
    # دعوات الانضمام للفريق (تحديث)
    MyTeamLeaderRequestNominateView,
    MyTeamInvitationsListView,
    MyTeamInvitationRespondView,
    # A6 + A8 (مدمجة)
    MyWithdrawalListCreateView,
)

app_name = 'marketers'

urlpatterns = [
    # ── A8 — بيانات المسوق نفسه ──────────────────────────────────────────────
    path('me/', MyMarketerDetailView.as_view(), name='my-detail'),

    # ── A2 + A8 — تسجيل/عرض أوردراته (GET+POST على نفس المسار) ──────────────
    path('me/orders/', MyMarketerOrderListCreateView.as_view(), name='my-order-list-create'),

    # ── A8 — أسعاره المحددة على المنتجات ─────────────────────────────────────
    path('me/product-prices/', MyProductPricesListView.as_view(), name='my-product-prices'),

    # ── A4 — طلب الترقية لـ Team Leader ───────────────────────────────────────
    path('me/team-leader-request/', MyTeamLeaderRequestView.as_view(), name='my-tlr'),
    path('me/team-leader-request/<int:pk>/respond/', MyTeamLeaderRequestRespondView.as_view(), name='my-tlr-respond'),
    path('me/team-leader-request/<int:pk>/nominate/', MyTeamLeaderRequestNominateView.as_view(), name='my-tlr-nominate'),
    path('available-for-team/', AvailableForTeamView.as_view(), name='available-for-team'),

    # ── دعوات الانضمام للفريق (تحديث) ─────────────────────────────────────────
    path('me/team-invitations/', MyTeamInvitationsListView.as_view(), name='my-team-invitations'),
    path('me/team-invitations/<int:pk>/respond/', MyTeamInvitationRespondView.as_view(), name='my-team-invitation-respond'),

    # ── A8 — قسم القائد فقط (IsTeamLeader، غير ذلك 403) ──────────────────────
    path('me/team/', MyTeamMembersListView.as_view(), name='my-team'),
    path('me/team/sales-summary/', MyTeamSalesSummaryView.as_view(), name='my-team-sales-summary'),
    path('me/rewards/', MyTeamRewardsListView.as_view(), name='my-rewards'),

    # ── A6 + A8 — طلبات سحب الأرباح (GET+POST على نفس المسار) ────────────────
    path('me/withdrawals/', MyWithdrawalListCreateView.as_view(), name='my-withdrawal-list-create'),
]