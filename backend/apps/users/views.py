from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db import models

from .serializers import RegisterSerializer, UserSerializer, UserProfileSerializer, ChangePasswordSerializer

User = get_user_model()


# ─────────────────── Auth Views ───────────────────

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # رجّع الـ tokens مع الـ register مباشرة
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


# ─────────────────── Permissions ───────────────────

class IsAdminOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'staff']


# ─────────────────── Customers Management ───────────────────

class AdminCustomerListView(generics.ListAPIView):
    """GET — قائمة كل العملاء"""
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrStaff]

    def get_queryset(self):
        qs = User.objects.filter(role='customer').select_related('profile')

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(email__icontains=search) |
                models.Q(username__icontains=search) |
                models.Q(phone__icontains=search)
            )
        return qs


class AdminCustomerDetailView(generics.RetrieveAPIView):
    """GET — تفاصيل عميل واحد مع أوردراته"""
    permission_classes = [IsAdminOrStaff]

    def get(self, request, pk):
        try:
            customer = User.objects.get(pk=pk, role='customer')
        except User.DoesNotExist:
            return Response(
                {"detail": "Customer not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        from apps.orders.serializers import OrderListSerializer
        from apps.orders.models import Order

        orders = Order.objects.filter(customer=customer)

        return Response({
            "customer": UserSerializer(customer).data,
            "total_orders": orders.count(),
            "total_spent": sum(o.total for o in orders),
            "orders": OrderListSerializer(orders, many=True).data,
        })