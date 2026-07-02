from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import serializers as drf_serializers
from django.contrib.auth import get_user_model
from django.db import models

from .serializers import (
    RegisterSerializer, UserSerializer, UserProfileSerializer,
    ChangePasswordSerializer, CustomerAccountSerializer,
)
from .models import CustomerAccount

User = get_user_model()


# ═════════════════════════════════════════════════════════════════
# Auth Views
# ═════════════════════════════════════════════════════════════════

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            "user": UserSerializer(user).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password changed successfully."})


# ═════════════════════════════════════════════════════════════════
# Permissions
# ═════════════════════════════════════════════════════════════════

class IsAdminOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'staff']


class IsAdminUser(IsAuthenticated):
    """يسمح بس لليوزرز اللي role=admin"""
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view)
            and getattr(request.user, 'role', None) == 'admin'
        )


# ═════════════════════════════════════════════════════════════════
# Customers Management
# ═════════════════════════════════════════════════════════════════

class AdminCustomerListView(generics.ListAPIView):
    """GET — قائمة كل العملاء"""
    serializer_class = CustomerAccountSerializer
    permission_classes = [IsAdminOrStaff]

    def get_queryset(self):
        qs = CustomerAccount.objects.all().annotate(
            total_orders=models.Count('orders'),
            total_spent=models.Sum('orders__total')
        )
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(email__icontains=search) |
                models.Q(name__icontains=search) |
                models.Q(phone__icontains=search)
            )
        return qs


class AdminCustomerDetailView(generics.RetrieveAPIView):
    """GET — تفاصيل عميل واحد مع أوردراته"""
    permission_classes = [IsAdminOrStaff]

    def get(self, request, pk):
        try:
            customer = CustomerAccount.objects.get(pk=pk)
        except CustomerAccount.DoesNotExist:
            return Response(
                {"detail": "Customer not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        from apps.orders.serializers import OrderListSerializer
        from apps.orders.models import Order

        orders = Order.objects.filter(customer_account=customer)
        return Response({
            "customer": CustomerAccountSerializer(customer).data,
            "total_orders": orders.count(),
            "total_spent": sum(o.total for o in orders),
            "orders": OrderListSerializer(orders, many=True).data,
        })


# ═════════════════════════════════════════════════════════════════
# Admin — User Management (جديد)
# ═════════════════════════════════════════════════════════════════

class AdminUserSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username',
            'first_name', 'last_name',
            'role', 'phone', 'is_active',
            'date_joined',
        ]
        read_only_fields = ['id', 'date_joined']


class AdminUserCreateSerializer(drf_serializers.ModelSerializer):
    password = drf_serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = [
            'email', 'username', 'first_name', 'last_name',
            'password', 'role', 'phone',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AdminUserListView(generics.ListAPIView):
    """
    GET /api/users/list/
    قائمة كل اليوزرز — للأدمن فقط
    """
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer

    def get_queryset(self):
        qs = User.objects.all().order_by('-date_joined')
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(
                models.Q(email__icontains=q) |
                models.Q(username__icontains=q) |
                models.Q(first_name__icontains=q) |
                models.Q(last_name__icontains=q)
            )
        return qs


class AdminUserRoleUpdateView(APIView):
    """
    PATCH /api/users/<id>/role/
    تعديل role يوزر معين — للأدمن فقط
    """
    permission_classes = [IsAdminUser]

    VALID_ROLES = {'admin', 'staff', 'customer', 'marketer'}

    def patch(self, request, pk):
        role = request.data.get('role')
        if role not in self.VALID_ROLES:
            return Response(
                {'detail': f'الدور غير صحيح. الأدوار المتاحة: {", ".join(self.VALID_ROLES)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {'detail': 'المستخدم غير موجود.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        user.role = role
        user.save(update_fields=['role'])
        return Response(AdminUserSerializer(user).data)


class AdminUserCreateView(generics.CreateAPIView):
    """
    POST /api/users/create/
    إنشاء يوزر جديد — للأدمن فقط
    """
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)