from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Cart, CartItem
from .serializers import (
    CartSerializer,
    AddToCartSerializer,
    UpdateCartItemSerializer,
)


def get_or_create_cart(request):
    """
    لو الـ user logged in      → جيب أو اعمل cart بالـ user
    لو guest                   → جيب أو اعمل cart بالـ session
    لو guest وعنده cart قديمة → امسح مشكلة ومرجعش
    """
    if request.user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(user=request.user)
    else:
        # تأكد إن الـ session_key موجود
        if not request.session.session_key:
            request.session.create()
        session_key = request.session.session_key
        cart, _ = Cart.objects.get_or_create(session_key=session_key, user=None)
    return cart


class CartView(APIView):
    """GET — جيب الـ Cart الحالية"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cart = get_or_create_cart(request)
        serializer = CartSerializer(cart)
        return Response(serializer.data)


class AddToCartView(APIView):
    """POST — أضف منتج للـ Cart"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart    = get_or_create_cart(request)
        variant = serializer.validated_data['variant']
        quantity = serializer.validated_data['quantity']

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            variant=variant,
            defaults={'quantity': quantity}
        )

        if not created:
            # المنتج موجود → زوّد الكمية
            new_quantity = cart_item.quantity + quantity

            # تأكد من الـ Stock قبل الزيادة
            if variant.stock.quantity < new_quantity:
                return Response(
                    {"detail": f"Only {variant.stock.quantity} items available."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            cart_item.quantity = new_quantity
            cart_item.save()

        return Response(
            CartSerializer(cart).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class CartItemView(APIView):
    """PATCH / DELETE — عدّل أو احذف item من الـ Cart"""
    permission_classes = [permissions.AllowAny]

    def get_item(self, request, item_id):
        cart = get_or_create_cart(request)
        try:
            return CartItem.objects.get(id=item_id, cart=cart)
        except CartItem.DoesNotExist:
            return None

    def patch(self, request, item_id):
        """تغيير الكمية"""
        cart_item = self.get_item(request, item_id)
        if not cart_item:
            return Response({"detail": "Item not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateCartItemSerializer(
            data=request.data,
            context={'cart_item': cart_item}
        )
        serializer.is_valid(raise_exception=True)
        cart_item.quantity = serializer.validated_data['quantity']
        cart_item.save()

        return Response(CartSerializer(cart_item.cart).data)

    def delete(self, request, item_id):
        """حذف item من الـ Cart"""
        cart_item = self.get_item(request, item_id)
        if not cart_item:
            return Response({"detail": "Item not found."}, status=status.HTTP_404_NOT_FOUND)

        cart = cart_item.cart
        cart_item.delete()
        return Response(CartSerializer(cart).data)


class ClearCartView(APIView):
    """DELETE — فرّغ الـ Cart كلها"""
    permission_classes = [permissions.AllowAny]

    def delete(self, request):
        cart = get_or_create_cart(request)
        cart.clear()
        return Response({"detail": "Cart cleared."}, status=status.HTTP_200_OK)


class CartSummaryView(APIView):
    """GET — ملخص الـ Cart للـ Checkout"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cart = get_or_create_cart(request)

        # تحقق من availability كل item قبل الـ Checkout
        unavailable = [
            {
                "item":      str(item),
                "requested": item.quantity,
                "available": item.variant.stock.quantity,
            }
            for item in cart.items.all()
            if not item.is_available
        ]

        return Response({
            "cart":        CartSerializer(cart).data,
            "ready":       len(unavailable) == 0,
            "unavailable": unavailable,
        })