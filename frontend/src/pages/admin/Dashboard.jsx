import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from '../../services/productService';
import './dashboard.css';

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

export default function Dashboard() {
  const {
    data: overview,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-dashboard-overview'],
    queryFn: () => getDashboardOverview(),
    retry: 1,
  });

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useQuery({
    queryKey: ['admin-product-categories'],
    queryFn: () => getProductCategories(),
    retry: 1,
  });

  const [feedback, setFeedback] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [activeProduct, setActiveProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsQueryError,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => getProducts(),
    retry: 1,
  });

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );

  const openAddModal = () => {  
    setModalMode('add');
    setActiveProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setModalMode('edit');
    setActiveProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
  };

  const handleSubmitProduct = async (payload) => {
    setIsSubmitting(true);

    try {
      let savedProduct;

      if (modalMode === 'edit' && activeProduct) {
        savedProduct = await updateProduct(activeProduct.id, payload);
        setFeedback({ type: 'success', message: 'Product updated successfully.' });
      } else {
        savedProduct = await createProduct(payload);
        setFeedback({ type: 'success', message: 'Product created successfully.' });
      }

      if (payload.imageFile) {
        await uploadProductImage(savedProduct.id, payload.imageFile);
      }

      await refetchProducts();      
      setIsModalOpen(false);
    } catch (submitError) {
      setFeedback({
        type: 'error',
        message: submitError instanceof Error ? submitError.message : 'Unable to save product.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    const approved = window.confirm(`Delete ${product.name}? This action cannot be undone.`);

    if (!approved) {
      return;
    }

    try {
      await deleteProduct(product.id);
      await refetchProducts();      
      setFeedback({ type: 'success', message: 'Product deleted successfully.' });
    } catch (deleteError) {
      setFeedback({
        type: 'error',
        message: deleteError instanceof Error ? deleteError.message : 'Unable to delete product.',
      });
    }
  };

  return (
    <section className="admin-dashboard-overview">
      <header className="admin-dashboard-overview__header">
        <h1>Dashboard Overview</h1>
        <p>Live admin snapshot for sales, orders, customers, and catalog performance.</p>
      </header>

      {isLoading && (
        <div className="stats-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatsCardSkeleton key={index} />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div className="dashboard-error" role="alert">
          <p>{error instanceof Error ? error.message : 'Something went wrong.'}</p>
          <button type="button" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {!isLoading && !isError && overview && (
        <div className="stats-grid">
          {overview.stats.map((stat) => (
            <StatsCard
              key={stat.key}
              title={stat.title}
              value={stat.value}
              change={stat.change}
              trend={stat.trend}
              icon={stat.key}
            />
          ))}
        </div>
      )}
      
      <section className="products-management">
        <header className="products-management__header">
          <div>
            <h2>Products Management</h2>
            <p>Manage catalog items, stock availability, and product pricing.</p>
          </div>
          <button type="button" onClick={openAddModal}>Add Product</button>
        </header>

        {feedback && (
          <div className={`products-feedback is-${feedback.type}`} role="status">
            {feedback.message}
          </div>
        )}

        {(productsQueryError || categoriesError) && (        
          <div className="dashboard-error" role="alert">
            <p>{(productsError instanceof Error ? productsError.message : '') || 'Unable to load categories.'}</p>            
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
      </section>

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