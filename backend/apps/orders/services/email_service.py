import logging
from typing import Iterable

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class OrderEmailService:
    """Reusable service responsible for composing and sending order emails."""

    @staticmethod
    def _tracking_link(order_id: int) -> str:
        base_url = getattr(settings, 'ORDER_TRACKING_BASE_URL', 'https://yourdomain.com')
        return f"{base_url.rstrip('/')}/track/{order_id}"

    @classmethod
    def send_order_confirmation(cls, order) -> bool:
        """Send confirmation email to customer + admin notification."""
        recipient = getattr(order.customer, 'email', '')
        if not recipient:
            logger.warning("Skipping confirmation email for order_id=%s: missing customer email", order.id)
            return False

        context = {
            'order': order,
            'order_items': order.items.all(),
            'tracking_link': cls._tracking_link(order.id),
            'status_label': order.get_status_display(),
        }
        html_content = render_to_string('orders/emails/order_confirmation.html', context)
        text_content = strip_tags(html_content)

        # Send to customer
        result = cls._send_email(
            subject='Order Confirmation',
            body=text_content,
            to_emails=[recipient],
            html_content=html_content,
            order_id=order.id,
            email_type='order_confirmation',
        )

        # Send admin notification
        cls._send_admin_notification(order)

        return result

    @classmethod
    def _send_admin_notification(cls, order) -> bool:
        """Send a new order notification to the store admin."""
        admin_email = getattr(settings, 'ADMIN_ORDER_EMAIL', None)
        if not admin_email:
            logger.warning("ADMIN_ORDER_EMAIL not set — skipping admin notification for order_id=%s", order.id)
            return False

        customer_name = getattr(order.customer, 'get_full_name', lambda: '')() or getattr(order.customer, 'username', 'Unknown')
        customer_email = getattr(order.customer, 'email', 'N/A')

        items_lines = '\n'.join(
            f"  - {item.product.name} × {item.quantity}  ({item.price} EGP)"
            for item in order.items.all()
        )

        body = (
            f"🛒 New Order Received — #{order.id}\n\n"
            f"Customer : {customer_name}\n"
            f"Email    : {customer_email}\n"
            f"Total    : {order.total_price} EGP\n"
            f"Status   : {order.get_status_display()}\n\n"
            f"Items:\n{items_lines}\n\n"
            f"Tracking : {cls._tracking_link(order.id)}"
        )

        html_content = (
            f"<h2>🛒 New Order — #{order.id}</h2>"
            f"<p><b>Customer:</b> {customer_name}<br>"
            f"<b>Email:</b> {customer_email}<br>"
            f"<b>Total:</b> {order.total_price} EGP<br>"
            f"<b>Status:</b> {order.get_status_display()}</p>"
            f"<h3>Items</h3><ul>"
            + ''.join(
                f"<li>{item.product.name} × {item.quantity} — {item.price} EGP</li>"
                for item in order.items.all()
            )
            + f"</ul><p><a href='{cls._tracking_link(order.id)}'>Track Order</a></p>"
        )

        return cls._send_email(
            subject=f"[2Roots] New Order #{order.id} from {customer_name}",
            body=body,
            to_emails=[admin_email],
            html_content=html_content,
            order_id=order.id,
            email_type='admin_new_order',
        )

    @classmethod
    def send_order_status_update(cls, order, note: str = '') -> bool:
        recipient = getattr(order.customer, 'email', '')
        if not recipient:
            logger.warning("Skipping status email for order_id=%s: missing customer email", order.id)
            return False

        context = {
            'order': order,
            'status_label': order.get_status_display(),
            'note': note or cls._default_status_note(order.status),
            'tracking_link': cls._tracking_link(order.id),
        }
        html_content = render_to_string('orders/emails/order_status_update.html', context)
        text_content = strip_tags(html_content)

        return cls._send_email(
            subject=f"Order #{order.id} Status Update",
            body=text_content,
            to_emails=[recipient],
            html_content=html_content,
            order_id=order.id,
            email_type='order_status_update',
        )

    @staticmethod
    def _default_status_note(status: str) -> str:
        notes = {
            'pending': 'Your order is pending review and will be confirmed shortly.',
            'confirmed': 'Your order has been confirmed and is now being prepared.',
            'shipped': 'Great news! Your order has been shipped and is on the way.',
            'delivered': 'Your order has been delivered. Thank you for shopping with us!',
            'cancelled': 'Your order has been cancelled. Contact support if you need help.',
        }
        return notes.get(status, 'Your order status has been updated.')

    @staticmethod
    def _send_email(
        *,
        subject: str,
        body: str,
        to_emails: Iterable[str],
        html_content: str,
        order_id: int,
        email_type: str,
    ) -> bool:
        try:
            message = EmailMultiAlternatives(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=list(to_emails),
            )
            message.attach_alternative(html_content, 'text/html')
            message.send(fail_silently=False)
            logger.info(
                "Email delivered successfully: type=%s order_id=%s recipients=%s",
                email_type,
                order_id,
                list(to_emails),
            )
            return True
        except Exception as exc:
            logger.exception(
                "Email delivery failed: type=%s order_id=%s error=%s",
                email_type,
                order_id,
                str(exc),
            )
            return False