"""
sitemap_generator.py
====================
سكريبت Django Management Command يولد sitemap.xml ديناميكي
بيشمل كل منتجات الموقع.

الاستخدام:
  python manage.py generate_sitemap

أو أضفه كـ cron job يتشغل كل يوم.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.products.models import Product   # عدّل الـ import حسب موقع الـ model عندك


SITE_URL = 'https://2roots.store'


class Command(BaseCommand):
    help = 'Generate sitemap.xml with all active product URLs'

    def handle(self, *args, **kwargs):
        products = Product.objects.filter(is_active=True).values('slug', 'updated_at')

        static_pages = [
            {'loc': f'{SITE_URL}/',         'priority': '1.0', 'changefreq': 'daily'},
            {'loc': f'{SITE_URL}/products', 'priority': '0.9', 'changefreq': 'daily'},
        ]

        urls_xml = ''

        # Static pages
        for page in static_pages:
            urls_xml += f"""
  <url>
    <loc>{page['loc']}</loc>
    <changefreq>{page['changefreq']}</changefreq>
    <priority>{page['priority']}</priority>
  </url>"""

        # Product pages
        for product in products:
            lastmod = product['updated_at'].strftime('%Y-%m-%d') if product['updated_at'] else timezone.now().strftime('%Y-%m-%d')
            urls_xml += f"""
  <url>
    <loc>{SITE_URL}/products/{product['slug']}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>"""

        sitemap = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls_xml}
</urlset>"""

        # حفظ في مجلد public الفرونت إند
        output_path = 'frontend/public/sitemap.xml'
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(sitemap)

        self.stdout.write(self.style.SUCCESS(f'✅ sitemap.xml generated with {len(list(products))} products → {output_path}'))