import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import api, { clearTokens, getAccessToken } from './services/api';
import './i18n';

// Layout
import Navbar from './components/layout/Navbar';
import Footer from './components/Footer';

// Pages
const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Protected
import PrivateRoute from './components/ui/PrivateRoute';
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const OrdersListPage = lazy(() => import('./pages/orders/OrdersListPage'));
const OrderDetailsPage = lazy(() => import('./pages/orders/OrderDetailsPage'));
const NewOrderPage = lazy(() => import('./pages/orders/NewOrderPage'));
const MyOrdersPage = lazy(() => import('./pages/orders/MyOrdersPage'));
const CustomersListPage = lazy(() => import('./pages/customers/CustomersListPage'));
const CustomerDetailsPage = lazy(() => import('./pages/customers/CustomerDetailsPage'));
const InvoicesListPage = lazy(() => import('./pages/invoices/InvoicesListPage'));
const InvoiceDetailsPage = lazy(() => import('./pages/invoices/InvoiceDetailsPage'));
const ShippingSettingsPage = lazy(() => import('./pages/shipping/ShippingSettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Marketer (self)
const MarketerDashboardPage = lazy(() => import('./pages/marketers/MarketerDashboardPage'));
const TeamLeaderDashboardPage = lazy(() => import('./pages/marketers/TeamLeaderDashboardPage'));

// Admin — Marketers system (Part A11)
const MarketersListPage = lazy(() => import('./pages/marketers/MarketersListPage'));
const MarketerAdminDetailsPage = lazy(() => import('./pages/marketers/MarketerAdminDetailsPage'));
const MarketerOrdersReviewPage = lazy(() => import('./pages/marketers/MarketerOrdersReviewPage'));
const RewardTiersSettingsPage = lazy(() => import('./pages/marketers/RewardTiersSettingsPage'));
const TeamRewardsPage = lazy(() => import('./pages/marketers/TeamRewardsPage'));
const WithdrawalsReviewPage = lazy(() => import('./pages/marketers/WithdrawalsReviewPage'));

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
          <Suspense fallback={<div className="app-loading-spinner" role="status" aria-live="polite">Loading…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:slug" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/track/:id" element={<OrderTracking />} />
              <Route path="/track-order/:id" element={<OrderTracking />} />

              {/* Protected — any logged-in user */}
              <Route element={<PrivateRoute />}>
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/my-orders" element={<MyOrdersPage />} />
                <Route path="/orders" element={<MyOrdersPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              {/* Marketer dashboard — regular marketer */}
              <Route element={<PrivateRoute roles={['marketer']} />}>
                <Route path="/marketer" element={<MarketerDashboardPage />} />
                <Route path="/marketer/dashboard" element={<MarketerDashboardPage />} />
              </Route>

              {/* Team Leader dashboard — User.role='marketer', Marketer.role='team_leader'
                  Same PrivateRoute guard; the page itself verifies team_leader role via API */}
              <Route element={<PrivateRoute roles={['marketer']} />}>
                <Route path="/marketer/team-leader" element={<TeamLeaderDashboardPage />} />
              </Route>

              {/* Admin — existing pages */}
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

                {/* Admin — Marketers system (Part A11) */}
                <Route path="/dashboard/marketers" element={<MarketersListPage />} />
                <Route path="/dashboard/marketers/:id" element={<MarketerAdminDetailsPage />} />
                <Route path="/dashboard/marketer-orders" element={<MarketerOrdersReviewPage />} />
                <Route path="/dashboard/reward-tiers" element={<RewardTiersSettingsPage />} />
                <Route path="/dashboard/team-rewards" element={<TeamRewardsPage />} />
                <Route path="/dashboard/withdrawals" element={<WithdrawalsReviewPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}