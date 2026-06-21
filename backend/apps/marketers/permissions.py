from rest_framework.permissions import BasePermission


class IsMarketer(BasePermission):
    """
    يسمح فقط للمستخدم اللي معاه Marketer profile (role = marketer أو team_leader).
    """
    message = "هذا الإجراء متاح فقط للمسوقين المسجلين."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role not in ('marketer', 'team_leader'):
            return False
        return hasattr(user, 'marketer_profile')


class IsAdminOrStaff(BasePermission):
    """
    مكرَّرة محليًا هنا بنفس منطق IsAdminOrStaff الموجودة في apps/dashboard/views.py
    (تجنبًا لـ coupling بين apps. لو فيه permissions.py مشترك فعلي في المشروع،
    وحّد عليه بدل النسخة دي).
    """
    message = "هذا الإجراء متاح فقط للإدارة."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in ('admin', 'staff'))