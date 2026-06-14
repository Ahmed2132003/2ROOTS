from rest_framework import generics, viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import serializers
from .models import Category, Product, ProductVariant, ProductImage
from .serializers import (
    CategorySerializer,
    ProductListSerializer, ProductDetailSerializer, ProductWriteSerializer,
    ProductVariantWriteSerializer, ProductVariantSerializer, ProductImageSerializer,
)
from .filters import ProductFilter


# ─── Public Views ──────────────────────────────────────────────────────────────

class CategoryListView(generics.ListAPIView):
    serializer_class   = CategorySerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        return Category.objects.filter(is_active=True, parent=None)


class ProductListView(generics.ListAPIView):
    serializer_class   = ProductListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class    = ProductFilter
    search_fields      = ['name', 'description', 'category__name']
    ordering_fields    = ['base_price', 'created_at']
    ordering           = ['-created_at']

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        return Product.objects.filter(is_active=True).select_related('category').prefetch_related(
            'images', 'variants__stock', 'variants__color', 'variants__size'
        )


class ProductDetailView(generics.RetrieveAPIView):
    serializer_class   = ProductDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field       = 'slug'

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        return Product.objects.filter(is_active=True).prefetch_related(
            'images', 'variants__stock', 'variants__color', 'variants__size'
        )


class FeaturedProductsView(generics.ListAPIView):
    serializer_class   = ProductListSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        from django.db.models import Sum
        from apps.orders.models import OrderItem

        top_ids = list(
            OrderItem.objects.filter(order__status__in=['delivered'])
            .values('variant__product_id')
            .annotate(total_sold=Sum('quantity'))
            .order_by('-total_sold')
            .values_list('variant__product_id', flat=True)[:5]
        )

        if top_ids:
            preserved = {pid: idx for idx, pid in enumerate(top_ids)}
            return sorted(
                Product.objects.filter(id__in=top_ids, is_active=True)
                    .select_related('category')
                    .prefetch_related('images', 'variants__stock', 'variants__color', 'variants__size'),
                key=lambda p: preserved.get(p.id, 9999)
            )

        return Product.objects.filter(is_active=True).select_related('category').prefetch_related(
            'images', 'variants__stock', 'variants__color', 'variants__size'
        ).order_by('-created_at')[:5]


# ─── Admin Views ───────────────────────────────────────────────────────────────

class IsAdminOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'staff']


def _wrap_django_file(processed_file, filename, content_type):
    """Wrap an io.BytesIO as a Django InMemoryUploadedFile."""
    from django.core.files.uploadedfile import InMemoryUploadedFile
    processed_file.seek(0, 2)
    size = processed_file.tell()
    processed_file.seek(0)
    return InMemoryUploadedFile(processed_file, 'image', filename, content_type, size, None)


class AdminProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrStaff]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    search_fields      = ['name', 'category__name']

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        return Product.objects.all().select_related('category').prefetch_related(
            'images', 'variants__stock', 'variants__color', 'variants__size'
        )

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProductWriteSerializer
        return ProductDetailSerializer

    # ── Image Upload ───────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request, pk=None):
        from .image_upload import validate_and_process_image
        product = self.get_object()

        file_obj = request.FILES.get('image')
        if not file_obj:
            return Response({'detail': 'No image file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            processed_file, filename, content_type = validate_and_process_image(file_obj)
            django_file = _wrap_django_file(processed_file, filename, content_type)
            is_primary = request.data.get('is_primary', request.data.get('is_main', 'false')) in [True, 'true', 'True', '1', 1]
            image = ProductImage.objects.create(
                product=product,
                image=django_file,
                alt_text=request.data.get('alt_text') or filename,
                is_primary=is_primary,
            )
            return Response(
                ProductImageSerializer(image, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({'detail': f'Upload failed: {exc}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get', 'post'], parser_classes=[MultiPartParser, FormParser])
    def images(self, request, pk=None):
        from .image_upload import validate_and_process_image
        product = self.get_object()

        if request.method.lower() == 'get':
            return Response(
                ProductImageSerializer(product.images.all(), many=True, context={'request': request}).data
            )

        files = request.FILES.getlist('images') or request.FILES.getlist('image')
        if not files:
            return Response({'detail': 'No image files provided.'}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        errors = []
        base_order = product.images.count()
        is_primary_requested = request.data.get('is_primary', request.data.get('is_main', 'false')) in [True, 'true', 'True', '1', 1]

        for idx, file_obj in enumerate(files):
            try:
                processed_file, filename, content_type = validate_and_process_image(file_obj)
                django_file = _wrap_django_file(processed_file, filename, content_type)
                image = ProductImage.objects.create(
                    product=product,
                    image=django_file,
                    alt_text=request.data.get('alt_text') or filename,
                    is_primary=is_primary_requested and idx == 0,
                    order=base_order + idx,
                )
                created.append(image)
            except ValueError as exc:
                errors.append({'file': getattr(file_obj, 'name', '?'), 'error': str(exc)})
            except Exception as exc:
                errors.append({'file': getattr(file_obj, 'name', '?'), 'error': f'Upload failed: {exc}'})

        response_data = {
            'images': ProductImageSerializer(created, many=True, context={'request': request}).data
        }
        if errors:
            response_data['errors'] = errors

        if not created and errors:
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)
        return Response(response_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete', 'patch'], url_path=r'images/(?P<image_id>[^/.]+)')
    def image_detail(self, request, pk=None, image_id=None):
        product = self.get_object()
        try:
            image = product.images.get(id=image_id)
        except ProductImage.DoesNotExist:
            return Response({'detail': 'Image not found.'}, status=status.HTTP_404_NOT_FOUND)
        if request.method.lower() == 'delete':
            image.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = ProductImageSerializer(image, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'])
    def variants(self, request, pk=None):
        product = self.get_object()
        if request.method.lower() == 'get':
            return Response(ProductVariantSerializer(product.variants.all(), many=True).data)
        serializer = ProductVariantWriteSerializer(data={**request.data, 'product': product.id})
        serializer.is_valid(raise_exception=True)
        variant = serializer.save()
        return Response(ProductVariantSerializer(variant).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['put', 'patch', 'delete'], url_path=r'variants/(?P<variant_id>[^/.]+)')
    def variant_detail(self, request, pk=None, variant_id=None):
        product = self.get_object()
        try:
            variant = product.variants.get(id=variant_id)
        except ProductVariant.DoesNotExist:
            return Response({'detail': 'Variant not found.'}, status=status.HTTP_404_NOT_FOUND)
        if request.method.lower() == 'delete':
            variant.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = ProductVariantWriteSerializer(variant, data=request.data, partial=request.method.lower() == 'patch')
        serializer.is_valid(raise_exception=True)
        variant = serializer.save(product=product)
        return Response(ProductVariantSerializer(variant).data)

    @action(detail=True, methods=['post'])
    def add_variant(self, request, pk=None):
        product = self.get_object()
        serializer = ProductVariantWriteSerializer(data={**request.data, 'product': product.id})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrStaff]
    queryset = Category.objects.all().order_by('-created_at')
    serializer_class = CategorySerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        name = serializer.validated_data.get('name', '').strip()
        if not name:
            raise serializers.ValidationError({'name': 'Name is required.'})
        serializer.save(name=name)