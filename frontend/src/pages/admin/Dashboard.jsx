import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion as Motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import StatsCard from '../../components/dashboard/StatsCard';
import ProductTable from '../../components/products/ProductTable';
import ProductFormModal from '../../components/products/ProductFormModal';
import { getDashboardOverview } from '../../services/dashboardService';
import {
  createProduct,
  deleteProduct,
  getProductCategories,
  getProducts,
  updateProduct,
  uploadProductImage,
  createCategory,
  updateCategory,
  deleteCategory as removeCategory,
} from '../../services/productService';
import './dashboard.css';

/* ─── Skeleton row for stats ────────────────────────────────── */
function StatsCardSkeleton() {
  return (
    <article className="stats-card stats-card--skeleton" aria-hidden="true">
      <div className="skeleton skeleton-icon" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-value" />
      <div className="skeleton skeleton-change" />
    </article>
  );
}

/* ─── Eyebrow ───────────────────────────────────────────────── */
function Eyebrow({ children }) {
  return (
    <div
      style={{
        fontSize: '10px',
        color: 'var(--accent)',
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        fontWeight: 800,
        marginBottom: '6px',
      }}
    >
      ✦ {children}
    </div>
  );
}

/* ─── Quick link pill ───────────────────────────────────────── */
const QUICK_LINKS = [
  { to: '/dashboard/orders',   label: 'Orders' },
  { to: '/dashboard/customers', label: 'Customers' },
  { to: '/dashboard/invoices',  label: 'Invoices' },
  { to: '/dashboard/shipping',  label: 'Shipping' },
];

/* ─── Page ──────────────────────────────────────────────────── */
export default function Dashboard() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const tr = (en, ar) => (isRTL ? ar : en);

  const { isAuthReady, isAuthenticated, user } = useAuthStore();
  const isAdmin = String(user?.role || '').trim().toLowerCase() === 'admin';
  const canFetch = isAuthReady && isAuthenticated && isAdmin;

  /* ── Queries ── */
  const {
    data: overview,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-dashboard-overview'],
    queryFn: getDashboardOverview,
    retry: 1,
    enabled: canFetch,
  });

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['admin-product-categories'],
    queryFn: getProductCategories,
    retry: 1,
    enabled: canFetch,
  });

  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsQueryError,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['admin-products'],
    queryFn: getProducts,
    retry: 1,
    enabled: canFetch,
  });

  /* ── Product modal state ── */
  const [feedback, setFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [activeProduct, setActiveProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── Category state ── */
  const [categoryName, setCategoryName] = useState('');
  const [categoryImageFile, setCategoryImageFile] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryImageFile, setEditingCategoryImageFile] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  /* ── Product handlers ── */
  const openAddModal = () => { setModalMode('add'); setActiveProduct(null); setIsModalOpen(true); };
  const openEditModal = (product) => { setModalMode('edit'); setActiveProduct(product); setIsModalOpen(true); };
  const closeModal = () => { if (!isSubmitting) setIsModalOpen(false); };

  const handleSubmitProduct = async (payload) => {
    setIsSubmitting(true);
    try {
      const saved =
        modalMode === 'edit' && activeProduct
          ? await updateProduct(activeProduct.id, payload)
          : await createProduct(payload);
      if (payload.imageFiles?.length) await uploadProductImage(saved.id, payload.imageFiles);
      else if (payload.imageFile) await uploadProductImage(saved.id, payload.imageFile);
      await refetchProducts();
      setFeedback({
        type: 'success',
        message: modalMode === 'edit'
          ? tr('Product updated successfully.', 'تم تحديث المنتج بنجاح.')
          : tr('Product created successfully.', 'تم إنشاء المنتج بنجاح.'),
      });
      setIsModalOpen(false);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : tr('Unable to save product.', 'تعذّر حفظ المنتج.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`${tr('Delete', 'حذف')} ${product.name}?`)) return;
    await deleteProduct(product.id);
    await refetchProducts();
  };

  /* ── Category handlers ── */
  const handleAddCategory = async () => {
    if (!categoryName.trim()) return;
    await createCategory({ name: categoryName.trim(), is_active: true, image: categoryImageFile || undefined });
    setCategoryName('');
    setCategoryImageFile(null);
    await refetchCategories();
  };

  const openEditCategory = (cat) => {
    setEditingCategory(cat);
    setEditingCategoryName(cat.name);
    setEditingCategoryImageFile(null);
    setDeletingCategory(null);
  };
  const cancelEditCategory = () => {
    if (isCategorySubmitting) return;
    setEditingCategory(null);
    setEditingCategoryName('');
    setEditingCategoryImageFile(null);
  };
  const handleEditCategory = async () => {
    if (!editingCategory || !editingCategoryName.trim()) return;
    setIsCategorySubmitting(true);
    try {
      await updateCategory(editingCategory.id, {
        name: editingCategoryName.trim(),
        image: editingCategoryImageFile || undefined,
      });
      cancelEditCategory();
      await refetchCategories();
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  const openDeleteCategory = (cat) => { setDeletingCategory(cat); setEditingCategory(null); };
  const cancelDeleteCategory = () => { if (isCategorySubmitting) return; setDeletingCategory(null); };
  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setIsCategorySubmitting(true);
    try {
      await removeCategory(deletingCategory.id);
      setDeletingCategory(null);
      await refetchCategories();
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  return (
    <section className="admin-dashboard-overview">

      {/* ── Header ── */}
      <header className="admin-dashboard-overview__header">
        <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Eyebrow>{tr('Phase 8', 'المرحلة 8')}</Eyebrow>
          <h1>{tr('Dashboard Overview', 'نظرة عامة')}</h1>
          <p>{tr('Live admin snapshot — sales, orders, customers, and catalog.', 'لقطة إدارية مباشرة — المبيعات والطلبات والعملاء والكتالوج.')}</p>
        </Motion.div>

        <Motion.nav
          className="admin-dashboard-overview__quick-links"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
          aria-label={tr('Quick links', 'روابط سريعة')}
        >
          {QUICK_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="admin-dashboard-overview__orders-link">
              {tr(link.label, link.label)}
            </Link>
          ))}
        </Motion.nav>
      </header>

      {/* ── Stats grid ── */}
      {isLoading && (
        <div className="stats-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <Motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.07 }}
            >
              <StatsCardSkeleton />
            </Motion.div>
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div className="dashboard-error" role="alert">
          <p>{error instanceof Error ? error.message : tr('Something went wrong.', 'حدث خطأ ما.')}</p>
          <button type="button" onClick={() => refetch()}>
            {tr('Retry', 'إعادة المحاولة')}
          </button>
        </div>
      )}

      {!isLoading && !isError && overview && (
        <Motion.div
          className="stats-grid"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {overview.stats.map((stat, i) => (
            <Motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + i * 0.06 }}
            >
              <StatsCard
                title={stat.title}
                value={stat.value}
                change={stat.change}
                trend={stat.trend}
                icon={stat.key}
              />
            </Motion.div>
          ))}
        </Motion.div>
      )}

      {/* ── Categories management ── */}
      <Motion.section
        className="products-management"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <header className="products-management__header">
          <div>
            <Eyebrow>{tr('Catalog', 'الكتالوج')}</Eyebrow>
            <h2>{tr('Categories', 'الفئات')}</h2>
            <p>{tr('Create and manage product categories.', 'أنشئ فئات المنتجات وأدرها.')}</p>
          </div>

          {/* Add category inline form */}
          <div className="categories-management__create">
            <input
              className="orders-input"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder={tr('Category name', 'اسم الفئة')}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <input
              type="file"
              accept="image/*"
              className="orders-input categories-management__file-input"
              onChange={(e) => setCategoryImageFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              className="categories-management__panel-save"
              onClick={handleAddCategory}
              disabled={!categoryName.trim()}
            >
              {tr('Add', 'إضافة')}
            </button>
          </div>
        </header>

        <div className="orders-surface">
          {categoriesError && (
            <div className="dashboard-error" role="alert" style={{ marginBottom: '12px' }}>
              <p>{tr('Unable to load categories.', 'تعذّر تحميل الفئات.')}</p>
            </div>
          )}

          {(categories || []).map((cat) => (
            <div key={cat.id} className="categories-management__row">
              <span>{cat.name}</span>
              <div className="categories-management__actions">
                <button
                  type="button"
                  className="categories-management__action"
                  onClick={() => openEditCategory(cat)}
                >
                  {tr('Edit', 'تعديل')}
                </button>
                <button
                  type="button"
                  className="categories-management__action categories-management__action--danger"
                  onClick={() => openDeleteCategory(cat)}
                >
                  {tr('Delete', 'حذف')}
                </button>
              </div>
            </div>
          ))}

          {/* Edit panel */}
          {editingCategory && (
            <Motion.article
              className="categories-management__panel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              aria-live="polite"
            >
              <header>
                <h3>{tr('Edit Category', 'تعديل الفئة')}</h3>
                <p>{tr('Update the selected category.', 'حدّث الفئة المحددة.')}</p>
              </header>
              <div className="categories-management__panel-content">
                <input
                  className="orders-input"
                  value={editingCategoryName}
                  onChange={(e) => setEditingCategoryName(e.target.value)}
                  placeholder={tr('Category name', 'اسم الفئة')}
                />
                <input
                  type="file"
                  accept="image/*"
                  className="orders-input"
                  onChange={(e) => setEditingCategoryImageFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="categories-management__panel-actions">
                <button
                  type="button"
                  className="categories-management__panel-cancel"
                  onClick={cancelEditCategory}
                  disabled={isCategorySubmitting}
                >
                  {tr('Cancel', 'إلغاء')}
                </button>
                <button
                  type="button"
                  className="categories-management__panel-save"
                  onClick={handleEditCategory}
                  disabled={isCategorySubmitting || !editingCategoryName.trim()}
                >
                  {isCategorySubmitting ? tr('Saving…', 'جارٍ الحفظ…') : tr('Save', 'حفظ')}
                </button>
              </div>
            </Motion.article>
          )}

          {/* Delete confirm panel */}
          {deletingCategory && (
            <Motion.article
              className="categories-management__panel categories-management__panel--danger"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              aria-live="polite"
            >
              <header>
                <h3>{tr('Delete Category', 'حذف الفئة')}</h3>
                <p>
                  {tr('This will permanently delete', 'سيؤدي هذا إلى حذف')}{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{deletingCategory.name}</strong>.{' '}
                  {tr('This action cannot be undone.', 'لا يمكن التراجع عن هذا الإجراء.')}
                </p>
              </header>
              <div className="categories-management__panel-actions">
                <button
                  type="button"
                  className="categories-management__panel-cancel"
                  onClick={cancelDeleteCategory}
                  disabled={isCategorySubmitting}
                >
                  {tr('Keep', 'إبقاء')}
                </button>
                <button
                  type="button"
                  className="categories-management__action categories-management__action--danger"
                  onClick={handleDeleteCategory}
                  disabled={isCategorySubmitting}
                >
                  {isCategorySubmitting ? tr('Deleting…', 'جارٍ الحذف…') : tr('Delete', 'حذف')}
                </button>
              </div>
            </Motion.article>
          )}
        </div>
      </Motion.section>

      {/* ── Products management ── */}
      <Motion.section
        className="products-management"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <header className="products-management__header">
          <div>
            <Eyebrow>{tr('Catalog', 'الكتالوج')}</Eyebrow>
            <h2>{tr('Products', 'المنتجات')}</h2>
            <p>{tr('Manage items, stock, and pricing.', 'أدر العناصر والمخزون والتسعير.')}</p>
          </div>
          <button type="button" onClick={openAddModal}>
            + {tr('Add Product', 'إضافة منتج')}
          </button>
        </header>

        {feedback && (
          <Motion.div
            className={`products-feedback is-${feedback.type}`}
            role="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {feedback.message}
          </Motion.div>
        )}

        {(productsQueryError || categoriesError) && (
          <div className="dashboard-error" role="alert" style={{ marginBottom: '14px' }}>
            <p>
              {productsError instanceof Error
                ? productsError.message
                : tr('Unable to load products.', 'تعذّر تحميل المنتجات.')}
            </p>
          </div>
        )}

        {!productsQueryError && (
          <ProductTable
            products={sortedProducts}
            loading={productsLoading}
            onAddProduct={openAddModal}
            onEditProduct={openEditModal}
            onDeleteProduct={handleDeleteProduct}
          />
        )}
      </Motion.section>

      {/* ── Product modal ── */}
      {isModalOpen && (
        <ProductFormModal
          key={`${modalMode}-${activeProduct?.id ?? 'new'}`}
          isOpen={isModalOpen}
          mode={modalMode}
          categories={categories}
          categoriesLoading={categoriesLoading}
          initialProduct={activeProduct}
          isSubmitting={isSubmitting}
          onClose={closeModal}
          onSubmit={handleSubmitProduct}
        />
      )}
    </section>
  );
}