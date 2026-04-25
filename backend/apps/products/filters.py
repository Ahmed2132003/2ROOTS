import django_filters
from .models import Product


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name='base_price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='base_price', lookup_expr='lte')
    category  = django_filters.CharFilter(field_name='category__slug')
    in_stock  = django_filters.BooleanFilter(method='filter_in_stock')

    class Meta:
        model  = Product
        fields = ['min_price', 'max_price', 'category', 'is_featured']

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(variants__stock__quantity__gt=0).distinct()
        return queryset.filter(variants__stock__quantity=0).distinct()