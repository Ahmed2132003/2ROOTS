"""
apps/marketers/dashboard_views.py

كل الـ Admin/Dashboard views بتاعة نظام المسوقين، في ملف واحد منفصل
عن views.py (اللي فيه بس endpoints المسوق نفسه self-service).

⚠️ قرار Part A7: الـ Admin Views اللي كانت متعملة في views.py خلال
A2/A4/A5/A6 (AdminMarketerOrderListView, AdminMarketerOrderConfirmView,
AdminMarketerOrderRejectView, AdminPromoteToLeaderView,
AdminEvaluateTeamRewardsView, AdminWithdrawalListView,
AdminWithdrawalApproveView, AdminWithdrawalRejectView) انتقلت هنا
بدون أي تغيير في منطقها الداخلي — فقط نقل مكان. باقي الكلاسات في
الملف ده (تسعير، قائمة/تفاصيل المسوقين، درجات/مكافآت الفريق، طلبات
الترقية) جديدة من Part A7.

- Part A2 (moved): مراجعة/تأكيد/رفض أوردرات المسوقين      ✅
- Part A4 (moved): الترقية اليدوية من الأدمن                ✅
- Part A5 (moved): تقييم مكافآت الفريق يدويًا                ✅
- Part A6 (moved): مراجعة طلبات السحب                       ✅
- Part A7 (new):  تسعير، إدارة المسوقين، درجات/مكافآت الفريق،
                   مراقبة طلبات الترقية

⚠️ تحديث (تكامل أوردرات المسوقين بنظام الأوردرات الأساسي):
AdminMarketerOrderConfirmView منطقها الداخلي اتنقل لدالة مشتركة
confirm_marketer_order() في views.py، عشان نفس المنطق يُستخدم برضو
في signals.py للتأكيد التلقائي لما الـ Order المرتبط يوصل 'delivered'.
السلوك الخارجي للـ endpoint ده (نفس الـ response، نفس رسائل الخطأ،
نفس شرط idempotency) **لم يتغيّر إطلاقًا**.
"""
from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

User = get_user_model()

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Marketer, MarketerProductPrice, MarketerOrder,
    RewardTier, TeamReward, TeamLeaderRequest, WithdrawalRequest,
)
from .permissions import IsAdminOrStaff
from .serializers import (
    MarketerSerializer, MarketerAdminDetailSerializer, MarketerStatusUpdateSerializer,
    MarketerProductPriceSerializer, MarketerProductPriceCreateSerializer,
    MarketerProductPriceUpdateSerializer,
    MarketerOrderSerializer,
    RewardTierSerializer,
    TeamRewardSerializer, TeamRewardStatusUpdateSerializer,
    TeamLeaderRequestSerializer,
    WithdrawalRequestSerializer,
)
from .services import evaluate_all_team_rewards
# helpers مشتركة — تعريفهم الأساسي في views.py (المسوق نفسه)
from .views import (
    _apply_counters, rollback_marketer_order_counters, _maybe_trigger_leader_request,
    confirm_marketer_order,
)


# ═════════════════════════════════════════════════════════════════════════════
# Admin-facing — A2 (moved as-is)
# ═════════════════════════════════════════════════════════════════════════════

class AdminMarketerOrderListView(generics.ListAPIView):
    """GET /api/dashboard/marketer-orders/?status=&marketer="""
    serializer_class   = MarketerOrderSerializer
    permission_classes = [IsAdminOrStaff]

    def get_queryset(self):
        qs = MarketerOrder.objects.select_related(
            'marketer__user', 'product', 'shipping_region', 'linked_order'
        ).prefetch_related(
            'items__product', 'items__variant__color', 'items__variant__size'
        ).all()
        status_param   = self.request.query_params.get('status')
        marketer_param = self.request.query_params.get('marketer')
        if status_param:
            qs = qs.filter(status=status_param)
        if marketer_param:
            qs = qs.filter(marketer_id=marketer_param)
        return qs
    

class AdminMarketerOrderConfirmView(APIView):
    """
    PATCH /api/dashboard/marketer-orders/{id}/confirm/

    ⚠️ المنطق الداخلي بقى في confirm_marketer_order() (views.py) — نفس
    الدالة المستخدمة في التأكيد التلقائي عند delivered. الـ endpoint ده
    لسه بيشتغل بالظبط زي ما كان (نفس response، نفس رسالة الخطأ لو
    الأوردر مؤكَّد بالفعل).
    """
    permission_classes = [IsAdminOrStaff]

    @transaction.atomic
    def patch(self, request, pk):
        order = get_object_or_404(
            MarketerOrder.objects.select_for_update().select_related('marketer'),
            pk=pk,
        )

        if order.status == 'confirmed':
            return Response(
                {"detail": "هذا الأوردر مؤكَّد بالفعل."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        confirm_marketer_order(order)

        return Response(MarketerOrderSerializer(order).data, status=status.HTTP_200_OK)


class AdminMarketerOrderRejectView(APIView):
    """PATCH /api/dashboard/marketer-orders/{id}/reject/"""
    permission_classes = [IsAdminOrStaff]

    @transaction.atomic
    def patch(self, request, pk):
        order = get_object_or_404(
            MarketerOrder.objects.select_for_update().select_related('marketer'),
            pk=pk,
        )

        if order.status == 'rejected':
            return Response(
                {"detail": "هذا الأوردر مرفوض بالفعل."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rollback_marketer_order_counters(order)

        order.status = 'rejected'
        order.save(update_fields=['status'])

        return Response(MarketerOrderSerializer(order).data, status=status.HTTP_200_OK)


# ═════════════════════════════════════════════════════════════════════════════
# Admin-facing — A4 (moved as-is): ترقية يدوية بدون شروط
# ═════════════════════════════════════════════════════════════════════════════

class AdminPromoteToLeaderView(APIView):
    """
    POST /api/dashboard/marketers/{id}/promote-to-leader/
    override كامل من الأدمن — لا تارجت، لا 10 مسوقين، لا TeamLeaderRequest.
    """
    permission_classes = [IsAdminOrStaff]

    @transaction.atomic
    def post(self, request, pk):
        marketer = get_object_or_404(
            Marketer.objects.select_for_update(),
            pk=pk,
        )

        if marketer.role == 'team_leader':
            return Response(
                {"detail": "هذا المسوق هو قائد فريق بالفعل."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        marketer.credited_team_leader  = marketer.team_leader
        marketer.role                  = 'team_leader'
        marketer.promoted_to_leader_at = timezone.now()
        marketer.save(update_fields=[
            'credited_team_leader', 'role', 'promoted_to_leader_at',
        ])

        return Response(
            {"detail": f"تمت ترقية {marketer.user.email} لـ Team Leader يدوياً."},
            status=status.HTTP_200_OK,
        )


# ═════════════════════════════════════════════════════════════════════════════
# Admin-facing — A5 (moved as-is): تقييم مكافآت الفِرَق يدويًا
# ═════════════════════════════════════════════════════════════════════════════

class AdminEvaluateTeamRewardsView(APIView):
    """
    POST /api/dashboard/team-rewards/evaluate/
    يشغّل evaluate_all_team_rewards() فورًا لكل القادة.
    """
    permission_classes = [IsAdminOrStaff]

    def post(self, request):
        created = evaluate_all_team_rewards()
        return Response(
            {
                "created_count": len(created),
                "rewards": TeamRewardSerializer(created, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


# ═════════════════════════════════════════════════════════════════════════════
# Admin-facing — A6 (moved as-is): إدارة طلبات السحب
# ═════════════════════════════════════════════════════════════════════════════

class AdminWithdrawalListView(generics.ListAPIView):
    """GET /api/dashboard/withdrawals/?status="""
    permission_classes = [IsAdminOrStaff]
    serializer_class   = WithdrawalRequestSerializer

    def get_queryset(self):
        qs = WithdrawalRequest.objects.select_related(
            'marketer__user'
        ).order_by('-created_at')
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class AdminWithdrawalApproveView(APIView):
    """
    PATCH /api/dashboard/withdrawals/{id}/approve/

    عند approve:
    - يُخصم المبلغ من monthly_profit_balance (قرار A6: الخصم يحدث هنا).
    - يُحدَّث status → approved.
    - resolved_at = now().
    """
    permission_classes = [IsAdminOrStaff]

    @transaction.atomic
    def patch(self, request, pk):
        withdrawal = get_object_or_404(
            WithdrawalRequest.objects.select_for_update().select_related('marketer'),
            pk=pk,
        )

        if withdrawal.status != 'pending':
            return Response(
                {"detail": f"لا يمكن الاعتماد — الحالة الحالية: {withdrawal.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        marketer = withdrawal.marketer

        # تأكد الرصيد لسه كافي وقت الاعتماد
        if withdrawal.amount > marketer.monthly_profit_balance:
            return Response(
                {
                    "detail": (
                        f"الرصيد المتاح حالياً {marketer.monthly_profit_balance} جنيه، "
                        f"أقل من المبلغ المطلوب {withdrawal.amount} جنيه."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # خصم المبلغ من الرصيد الشهري (قرار A6: الخصم عند approve)
        marketer.monthly_profit_balance -= withdrawal.amount
        marketer.save(update_fields=['monthly_profit_balance'])

        withdrawal.status      = 'approved'
        withdrawal.resolved_at = timezone.now()
        withdrawal.save(update_fields=['status', 'resolved_at'])

        return Response(
            WithdrawalRequestSerializer(withdrawal).data,
            status=status.HTTP_200_OK,
        )


class AdminWithdrawalRejectView(APIView):
    """
    PATCH /api/dashboard/withdrawals/{id}/reject/

    عند reject:
    - لأن المبلغ لم يُخصم عند تقديم الطلب (قرار A6)، لا يوجد رصيد يرجع.
    - فقط يُحدَّث status → rejected + resolved_at.
    """
    permission_classes = [IsAdminOrStaff]

    @transaction.atomic
    def patch(self, request, pk):
        withdrawal = get_object_or_404(
            WithdrawalRequest.objects.select_for_update(),
            pk=pk,
        )

        if withdrawal.status != 'pending':
            return Response(
                {"detail": f"لا يمكن الرفض — الحالة الحالية: {withdrawal.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        withdrawal.status      = 'rejected'
        withdrawal.resolved_at = timezone.now()
        withdrawal.save(update_fields=['status', 'resolved_at'])

        return Response(
            WithdrawalRequestSerializer(withdrawal).data,
            status=status.HTTP_200_OK,
        )


# ═════════════════════════════════════════════════════════════════════════════
# Admin-facing — Part A7 (NEW): التسعير لكل مسوق/منتج
# ═════════════════════════════════════════════════════════════════════════════

class AdminMarketerProductPriceListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/dashboard/marketers/{marketer_id}/product-prices/
    POST /api/dashboard/marketers/{marketer_id}/product-prices/
    body (POST): {product: <id>, assigned_price: "xx.xx"}
    """
    permission_classes = [IsAdminOrStaff]

    def get_marketer(self):
        return get_object_or_404(Marketer, pk=self.kwargs['marketer_id'])

    def get_queryset(self):
        return (
            MarketerProductPrice.objects
            .filter(marketer_id=self.kwargs['marketer_id'])
            .select_related('product')
        )

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MarketerProductPriceCreateSerializer
        return MarketerProductPriceSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['marketer'] = self.get_marketer()
        return ctx


class AdminMarketerProductPriceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    PATCH  /api/dashboard/marketer-product-prices/{id}/  (تعديل assigned_price)
    DELETE /api/dashboard/marketer-product-prices/{id}/
    (GET متاح برضو كـ إضافة مفيدة — مش متطلب صريح في الخطة لكن غير مكلف ومتسق
    مع RetrieveUpdateDestroyAPIView، راجع تقرير A7 في PROGRESS.md)
    """
    permission_classes = [IsAdminOrStaff]
    queryset = MarketerProductPrice.objects.select_related('marketer__user', 'product')

    def get_serializer_class(self):
        if self.request.method in ['PATCH', 'PUT']:
            return MarketerProductPriceUpdateSerializer
        return MarketerProductPriceSerializer


# ═════════════════════════════════════════════════════════════════════════════
# Admin-facing — Part A7 (NEW): إدارة المسوقين
# ═════════════════════════════════════════════════════════════════════════════

class AdminMarketerListView(generics.ListCreateAPIView):
    """
    GET  /api/dashboard/marketers/?role=&status=
    POST /api/dashboard/marketers/  -- body: {user_id: <int>}
    """
    permission_classes = [IsAdminOrStaff]
    serializer_class   = MarketerSerializer

    def get_queryset(self):
        qs = Marketer.objects.select_related('user').order_by('-created_at')
        role_param   = self.request.query_params.get('role')
        status_param = self.request.query_params.get('status')
        if role_param:
            qs = qs.filter(role=role_param)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'detail': 'user_id required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = get_object_or_404(User, pk=user_id)
        if hasattr(user, 'marketer_profile'):
            return Response(
                {'detail': 'This user already has a marketer profile.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user.role != 'marketer':
            user.role = 'marketer'
            user.save(update_fields=['role'])
        marketer = Marketer.objects.create(user=user)
        return Response(MarketerSerializer(marketer).data, status=status.HTTP_201_CREATED)


class AdminMarketerDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/dashboard/marketers/{id}/  — تفاصيل كاملة
    PATCH /api/dashboard/marketers/{id}/  — status فقط (راجع
          MarketerStatusUpdateSerializer لسبب استبعاد role من هنا)
    """
    permission_classes = [IsAdminOrStaff]
    queryset = Marketer.objects.select_related(
        'user', 'team_leader__user', 'credited_team_leader__user',
    )

    def get_serializer_class(self):
        if self.request.method in ['PATCH', 'PUT']:
            return MarketerStatusUpdateSerializer
        return MarketerAdminDetailSerializer

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        # نرجّع التفاصيل الكاملة بعد التحديث، مش بس حقل status
        instance = self.get_object()
        return Response(MarketerAdminDetailSerializer(instance).data, status=response.status_code)


# ═════════════════════════════════════════════════════════════════════════════
# Admin-facing — Part A7 (NEW): المكافآت ودرجاتها
# ═════════════════════════════════════════════════════════════════════════════

class AdminRewardTierListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/dashboard/reward-tiers/"""
    permission_classes = [IsAdminOrStaff]
    queryset           = RewardTier.objects.all()
    serializer_class    = RewardTierSerializer


class AdminRewardTierDetailView(generics.RetrieveUpdateAPIView):
    """PATCH /api/dashboard/reward-tiers/{id}/ (GET متاح برضو للمراجعة)"""
    permission_classes = [IsAdminOrStaff]
    queryset           = RewardTier.objects.all()
    serializer_class    = RewardTierSerializer


class AdminTeamRewardListView(generics.ListAPIView):
    """GET /api/dashboard/team-rewards/?status="""
    permission_classes = [IsAdminOrStaff]
    serializer_class   = TeamRewardSerializer

    def get_queryset(self):
        qs = TeamReward.objects.select_related('marketer__user', 'tier').order_by('-created_at')
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class AdminTeamRewardUpdateView(APIView):
    """
    PATCH /api/dashboard/team-rewards/{id}/  body: {status: "approved"|"paid"}
    التسلسل: pending → approved → paid فقط (راجع TeamRewardStatusUpdateSerializer)
    """
    permission_classes = [IsAdminOrStaff]

    @transaction.atomic
    def patch(self, request, pk):
        reward = get_object_or_404(TeamReward.objects.select_for_update(), pk=pk)

        serializer = TeamRewardStatusUpdateSerializer(
            data=request.data,
            context={'instance': reward},
        )
        serializer.is_valid(raise_exception=True)

        reward.status = serializer.validated_data['status']
        reward.save(update_fields=['status'])

        return Response(TeamRewardSerializer(reward).data, status=status.HTTP_200_OK)


# ═════════════════════════════════════════════════════════════════════════════
# Admin-facing — Part A7 (NEW): طلبات الترقية (للعرض/المراقبة فقط)
# ═════════════════════════════════════════════════════════════════════════════

class AdminTeamLeaderRequestListView(generics.ListAPIView):
    """
    GET /api/dashboard/team-leader-requests/?status=
    للعرض/المراقبة فقط — القبول/الرفض من المسوق نفسه (Part A4، endpoints
    في views.py: MyTeamLeaderRequestRespondView / MyTeamLeaderRequestSubmitTeamView).
    """
    permission_classes = [IsAdminOrStaff]
    serializer_class   = TeamLeaderRequestSerializer

    def get_queryset(self):
        qs = TeamLeaderRequest.objects.select_related('marketer__user').order_by('-triggered_at')
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return qs