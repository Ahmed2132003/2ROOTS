from django.urls import path

from .views import MyMarketerOrderCreateView

app_name = 'marketers'

urlpatterns = [
    path('me/orders/', MyMarketerOrderCreateView.as_view(), name='my-order-create'),
]