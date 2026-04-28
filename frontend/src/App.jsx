import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import api, { clearTokens, getAccessToken } from './services/api';
import './i18n';

// Layout
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

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

export default function App() {
  const { theme } = useThemeStore();
  const { isAuthenticated, setUser, clearAuth } = useAuthStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    async function hydrateAuth() {
      if (isAuthenticated || !getAccessToken()) {
        return;
      }

      try {
        const response = await api.get('/auth/profile/');
        if (mounted) {
          setUser(response.data);
        }
      } catch {
        if (mounted) {
          clearTokens();
          clearAuth();
        }
      }
    }

    hydrateAuth();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, setUser, clearAuth]);

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

            {/* Protected Routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/checkout" element={<Checkout />} />              
            </Route>

            {/* Admin */}
            <Route element={<PrivateRoute roles={['admin', 'staff']} />}>            
              <Route path="/dashboard/*" element={<Dashboard />} />
              <Route path="/dashboard/orders" element={<OrdersListPage />} />
              <Route path="/dashboard/orders/:id" element={<OrderDetailsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}