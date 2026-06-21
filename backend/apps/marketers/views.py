"""
apps/marketers/views.py

الـ views الكاملة هتتكتب في Parts التالية:
- Part A2: تسجيل الأوردر + تأكيد الأدمن
- Part A4: طلب الترقية
- Part A6: سحب الأرباح
- Part A7: API إدارة الداشبورد
- Part A8: API المسوق الشخصي
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from .models import Marketer, MarketerOrder
from .permissions import IsAdminOrStaff, IsMarketer
from .serializers import MarketerOrderCreateSerializer, MarketerOrderSerializer

class IsAdminOrStaff(permissions.BasePermission):
    """نفس permission pattern المستخدم في apps/dashboard/views.py"""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in ['admin', 'staff']
        )


class IsMarketer(permissions.BasePermission):
    """صلاحية للمسوق المصادق عليه (active فقط)"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role != 'marketer':
            return False
        try:
            return request.user.marketer_profile.status == 'active'
        except Exception:
            return False


class IsMarketerOrTeamLeader(permissions.BasePermission):
    """صلاحية لأي مسوق (marketer أو team_leader) — active فقط"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role not in ['marketer', 'team_leader']:
            return False
        try:
            return request.user.marketer_profile.status == 'active'
        except Exception:
            return False


# Placeholder — سيُستبدل بالـ views الكاملة في Parts التالية
class PlaceholderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({"detail": "هيتنفذ في Parts التالية."})



# ═════════════════════════════════════════════════════════════════════════════
# Marketer-facing
# ═════════════════════════════════════════════════════════════════════════════

class MyMarketerOrderCreateView(generics.CreateAPIView):
    """POST /api/marketers/me/orders/ — المسوق يسجّل أوردر باعه بنفسه."""
    serializer_class = MarketerOrderCreateSerializer
    permission_classes = [IsMarketer]


# ═════════════════════════════════════════════════════════════════════════════
# Counters logic — قابلة لإعادة الاستخدام (confirm / rollback)
# ═════════════════════════════════════════════════════════════════════════════

def _apply_counters(marketer: Marketer, profit_amount, sign: int):
    """
    sign = +1  → إضافة العدادات (عند confirm)
    sign = -1  → إرجاعها (rollback عند reject بعد ما كان confirmed)
    """
    marketer.monthly_completed_orders_count = max(
        0, marketer.monthly_completed_orders_count + sign * 1
    )
    marketer.lifetime_total_orders = max(
        0, marketer.lifetime_total_orders + sign * 1
    )
    marketer.monthly_profit_balance = marketer.monthly_profit_balance + (sign * profit_amount)
    marketer.lifetime_total_profit = marketer.lifetime_total_profit + (sign * profit_amount)
    marketer.save(update_fields=[
        'monthly_completed_orders_count',
        'lifetime_total_orders',
        'monthly_profit_balance',
        'lifetime_total_profit',
    ])


def rollback_marketer_order_counters(order: MarketerOrder):
    """
    يرجع كل العدادات اللي كانت اتزودت عند confirm، ويصفّر is_counted.
    قابلة لإعادة الاستخدام من أي مكان (reject بعد confirm، تصحيح إداري، إلخ).
    لو الأوردر مكنش is_counted من الأساس، مفيش حاجة تتعمل (idempotent).
    """
    if not order.is_counted:
        return
    _apply_counters(order.marketer, order.profit_amount, sign=-1)
    order.is_counted = False
    order.counted_in_cycle_number = None
    order.counted_towards_leader = None
    order.save(update_fields=[
        'is_counted', 'counted_in_cycle_number', 'counted_towards_leader',
    ])


# ═════════════════════════════════════════════════════════════════════════════
# Admin-facing
# ═════════════════════════════════════════════════════════════════════════════

class AdminMarketerOrderListView(generics.ListAPIView):
    """GET /api/dashboard/marketer-orders/?status=&marketer="""
    serializer_class = MarketerOrderSerializer
    permission_classes = [IsAdminOrStaff]

    def get_queryset(self):
        qs = MarketerOrder.objects.select_related('marketer__user', 'product').all()
        status_param = self.request.query_params.get('status')
        marketer_param = self.request.query_params.get('marketer')
        if status_param:
            qs = qs.filter(status=status_param)
        if marketer_param:
            qs = qs.filter(marketer_id=marketer_param)
        return qs


class AdminMarketerOrderConfirmView(APIView):
    """PATCH /api/dashboard/marketer-orders/{id}/confirm/"""
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

        marketer = order.marketer

        # تحديد "مبيعات مين" يُحسب عليها هذا الأوردر (راجع قرار A1: counted_towards_leader)
        if marketer.role == 'team_leader':
            counted_towards = marketer.credited_team_leader
        else:
            counted_towards = marketer.team_leader

        order.status = 'confirmed'
        order.is_counted = True
        order.counted_in_cycle_number = marketer.current_cycle_number
        order.counted_towards_leader = counted_towards
        order.confirmed_at = timezone.now()
        order.save(update_fields=[
            'status', 'is_counted', 'counted_in_cycle_number',
            'counted_towards_leader', 'confirmed_at',
        ])

        _apply_counters(marketer, order.profit_amount, sign=+1)

        return Response(MarketerOrderSerializer(order).data, status=status.HTTP_200_OK)


class AdminMarketerOrderRejectView(APIView):
    """
    PATCH /api/dashboard/marketer-orders/{id}/reject/
    يغطي حالتين: رفض أوردر pending عادي، أو تراجع الأدمن عن confirm سابق
    (في الحالة الثانية: rollback كامل للعدادات قبل تغيير الحالة لـ rejected).
    """
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

        rollback_marketer_order_counters(order)  # idempotent — مفيش حاجة لو مكنش counted

        order.status = 'rejected'
        order.save(update_fields=['status'])

        return Response(MarketerOrderSerializer(order).data, status=status.HTTP_200_OK)