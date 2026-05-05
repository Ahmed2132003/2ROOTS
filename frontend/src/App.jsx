import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import api, { clearTokens, getAccessToken } from './services/api';
import './i18n';

// Layout
import Navbar from './components/layout/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import OrderTracking from './pages/OrderTracking';
import NotFound from './pages/NotFound';

// Protected
import PrivateRoute from './components/ui/PrivateRoute';
import Dashboard from './pages/admin/Dashboard';
import OrdersListPage from './pages/orders/OrdersListPage';
import OrderDetailsPage from './pages/orders/OrderDetailsPage';
import NewOrderPage from './pages/orders/NewOrderPage';
import MyOrdersPage from './pages/orders/MyOrdersPage';
import CustomersListPage from './pages/customers/CustomersListPage';
import CustomerDetailsPage from './pages/customers/CustomerDetailsPage';
import InvoicesListPage from './pages/invoices/InvoicesListPage';
import InvoiceDetailsPage from './pages/invoices/InvoiceDetailsPage';
import ShippingSettingsPage from './pages/shipping/ShippingSettingsPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const { theme } = useThemeStore();
  const { isAuthReady, setUser, clearAuth, setAuthReady } = useAuthStore();  

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    async function hydrateAuth() {
      const markAuthReady = () => {
        if (mounted && !isAuthReady && typeof setAuthReady === 'function') {
          setAuthReady(true);
        }
      };


      if (!getAccessToken()) {
        if (mounted) {
          clearAuth();
        }
        markAuthReady();               
        return;
      }

      try {
        const response = await api.get('/auth/profile/');
        if (mounted) {
          setUser(response.data);
        }
      } catch (error) {
        const status = error?.response?.status;
        const shouldLogout = status === 401 || status === 403;

        if (mounted && shouldLogout) {          
          clearTokens();
          clearAuth();
        }
      } finally {
        markAuthReady();
      }
    }

    hydrateAuth();

    return () => {
      mounted = false;
    };
  }, [isAuthReady, setUser, clearAuth, setAuthReady]);

  if (!isAuthReady) {
    return <div aria-busy="true" />;
  }

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />            
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/track/:id" element={<OrderTracking />} />
            <Route path="/track-order/:id" element={<OrderTracking />} />

            {/* Protected Routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/my-orders" element={<MyOrdersPage />} />
              <Route path="/orders" element={<MyOrdersPage />} />   
              <Route path="/orders" element={<MyOrdersPage />} />
              <Route path="/profile" element={<ProfilePage />} />               
            </Route>

            {/* Admin */}
            <Route element={<PrivateRoute roles={['admin', 'staff']} />}>            
              <Route path="/dashboard/*" element={<Dashboard />} />
              <Route path="/dashboard/orders" element={<OrdersListPage />} />
              <Route path="/dashboard/orders/new" element={<NewOrderPage />} />
              <Route path="/dashboard/orders/:id" element={<OrderDetailsPage />} />
              <Route path="/dashboard/customers" element={<CustomersListPage />} />
              <Route path="/dashboard/customers/:id" element={<CustomerDetailsPage />} />
              <Route path="/dashboard/invoices" element={<InvoicesListPage />} />
              <Route path="/dashboard/invoices/:id" element={<InvoiceDetailsPage />} />
              <Route path="/dashboard/shipping" element={<ShippingSettingsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}