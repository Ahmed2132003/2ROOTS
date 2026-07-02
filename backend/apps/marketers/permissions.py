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


class IsTeamLeader(BasePermission):
    """
    (Part A8) يسمح فقط للمسوقين اللي اترقّوا فعليًا لـ Team Leader.

    قرار مهم: الفحص هنا على `marketer_profile.role`، مش على `user.role`.
    السبب: حسب القرار التقني #2 في PROGRESS.md، الافتراض الحالي الرسمي هو
    إن `User.role` (موديل اليوزر العادي) لا يتغيّر أبداً عند الترقية —
    `Marketer.role` هو المصدر الوحيد الموثوق لمعرفة هل المسوق ده قائد فريق
    فعلاً أو لسه مسوق عادي. لو القرار #2 اتغيّر مستقبلاً وuser.role بقى
    بيتحدّث، الفحص هنا برضو يفضل صحيح لأنه بيرجع لمصدر الحقيقة الفعلي
    (marketer_profile)، مش لنسخة مكررة منه ممكن تتأخر في التحديث.
    """
    message = "هذا الإجراء متاح فقط لقادة الفرق (Team Leaders)."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if not hasattr(user, 'marketer_profile'):
            return False
        return user.marketer_profile.role == 'team_leader'


class IsAdminOrStaff(BasePermission):
    """
    مكرَّرة محليًا هنا بنفس منطق IsAdminOrStaff الموجودة في apps/dashboard/views.py
    (تجنبًا لـ coupling بين apps. لو فيه permissions.py مشترك فعلي في المشروع،
    وحّد عليه بدل النسخة دي).

    قرار Part A7 (مؤكَّد من صاحب المشروع): لا توحيد — تفضل النسخة المحلية دي.
    """
    message = "هذا الإجراء متاح فقط للإدارة."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in ('admin', 'staff'))