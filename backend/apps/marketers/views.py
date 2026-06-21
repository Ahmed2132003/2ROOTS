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