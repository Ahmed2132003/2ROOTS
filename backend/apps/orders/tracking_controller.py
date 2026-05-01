from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order


class TrackOrderView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, order_id):
        try:
            order = Order.objects.prefetch_related('items', 'status_history').get(id=order_id)            
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        status_labels = dict(Order.STATUS_CHOICES)

        return Response(
            {                
                'id': order.id,
                'status': order.status,
                'status_label': order.get_status_display(),                
                'shipping_name': order.shipping_name,
                'shipping_region': order.shipping_region,
                'total': order.total,
                'items': [
                    {
                        'product_name': item.product_name,
                        'variant_name': item.variant_name,
                        'quantity': item.quantity,
                        'price_at_order': item.price_at_order,
                    }
                    for item in order.items.all()
                ],
                'history': [
                    {
                        'status': history.new_status,
                        'status_label': status_labels.get(history.new_status, history.new_status),                        
                        'note': history.note,
                        'changed_at': history.changed_at,
                    }
                    for history in order.status_history.all()
                ],
                'tracking_link': f'/track/{order.id}',                
            }
        )