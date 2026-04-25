import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useThemeStore } from './store/themeStore';
import './i18n';

// Layout
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import Home          from './pages/Home';
import Products      from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart          from './pages/Cart';
import Checkout      from './pages/Checkout';
import Login         from './pages/Login';
import Register      from './pages/Register';
import OrderTracking from './pages/OrderTracking';
import NotFound      from './pages/NotFound';

// Protected
import PrivateRoute  from './components/ui/PrivateRoute';
import Dashboard     from './pages/Dashboard';

export default function App() {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/"               element={<Home />} />
            <Route path="/products"       element={<Products />} />
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/cart"           element={<Cart />} />
            <Route path="/login"          element={<Login />} />
            <Route path="/register"       element={<Register />} />
            <Route path="/track/:id"      element={<OrderTracking />} />

            {/* Protected Routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/checkout"   element={<Checkout />} />
            </Route>

            {/* Admin */}
            <Route element={<PrivateRoute roles={['admin','staff']} />}>
              <Route path="/dashboard/*" element={<Dashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}