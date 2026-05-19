import { lazy, Suspense, useLayoutEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

import Layout from './components/Layout';
import { CartProvider } from './contexts/CartContext';
import { scrollWindowToTop } from './lib/scroll';
import { useTheme } from './hooks/useTheme';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Recipes = lazy(() => import('./pages/Recipes'));
const FridgeSearch = lazy(() => import('./pages/Recipes/FridgeSearch'));
const RecipeDetail = lazy(() => import('./pages/Recipes/Detail'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogDetail = lazy(() => import('./pages/Blog/Detail'));
const Health = lazy(() => import('./pages/Health'));
const HealthDetail = lazy(() => import('./pages/Health/Detail'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminLogin = lazy(() => import('./pages/Admin/Login'));
const AdminLayout = lazy(() => import('./pages/Admin/Layout'));
const DashboardTab = lazy(() => import('./pages/Admin/tabs/DashboardTab'));
const ApprovalsTab = lazy(() => import('./pages/Admin/tabs/ApprovalsTab'));
const UsersTab = lazy(() => import('./pages/Admin/tabs/UsersTab'));
const RecipesTab = lazy(() => import('./pages/Admin/tabs/RecipesTab'));
const BlogsTab = lazy(() => import('./pages/Admin/tabs/BlogsTab'));
const FeedbackTab = lazy(() => import('./pages/Admin/tabs/FeedbackTab'));
const CommentsTab = lazy(() => import('./pages/Admin/tabs/CommentsTab'));
const CategoriesTab = lazy(() => import('./pages/Admin/tabs/CategoriesTab'));
const MarketProductsTab = lazy(() => import('./pages/Admin/tabs/MarketProductsTab'));
const MarketOrdersTab = lazy(() => import('./pages/Admin/tabs/MarketOrdersTab'));
const SellersTab = lazy(() => import('./pages/Admin/tabs/SellersTab'));
const AdminWithdrawalsTab = lazy(() => import('./pages/Admin/tabs/AdminWithdrawals'));

/* Marketplace */
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/Shop/Detail'));
const CartPage = lazy(() => import('./pages/Shop/Cart'));
const Checkout = lazy(() => import('./pages/Shop/Checkout'));
const OrdersPage = lazy(() => import('./pages/Shop/Orders'));
const OrderDetailPage = lazy(() => import('./pages/Shop/OrderDetail'));
const SellerDashboard = lazy(() => import('./pages/Seller'));
const SellerSettings = lazy(() => import('./pages/Seller/Settings'));
const CookPayWallet = lazy(() => import('./pages/Seller/EWallet'));
const Messages = lazy(() => import('./pages/Messages'));
const PublicProfile = lazy(() => import('./pages/Creator/PublicProfile'));

const EASE_PAGE = [0.22, 1, 0.36, 1] as const;

function PageFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-yellow-500 animate-spin" />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const reduceMotion = useReducedMotion();
  useTheme(); // Initialize theme globally

  /* Chỉ cuộn về đầu khi đổi pathname, tránh nháy khi đổi query (filter) */
  useLayoutEffect(() => {
    scrollWindowToTop();
  }, [location.pathname]);

  if (isAdminRoute) {
    return (
      <>
        <Toaster position="top-right" />
        <Suspense fallback={<PageFallback />}>
          <Routes location={location}>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardTab />} />
              <Route path="approvals" element={<ApprovalsTab />} />
              <Route path="users" element={<UsersTab />} />
              <Route path="recipes" element={<RecipesTab />} />
              <Route path="blogs" element={<BlogsTab />} />
              <Route path="comments" element={<CommentsTab />} />
              <Route path="categories" element={<CategoriesTab />} />
              <Route path="feedback" element={<FeedbackTab />} />
              <Route path="market-products" element={<MarketProductsTab />} />
              <Route path="market-orders" element={<MarketOrdersTab />} />
              <Route path="market-sellers" element={<SellersTab />} />
              <Route path="withdrawals" element={<AdminWithdrawalsTab />} />
            </Route>
          </Routes>
        </Suspense>
      </>
    );
  }

  const enterDur = reduceMotion ? 0.12 : 0.56;
  const exitDur = reduceMotion ? 0.1 : 0.44;

  return (
    <CartProvider>
    <Layout>
      <Toaster position="top-right" />
      {/*
        Grid: mọi trang con cùng ô → chồng lên nhau khi sync.
        Trang mới fade in đè trang cũ → không còn khoảng trống như mode="wait".
      */}
      <div className="grid [&>*]:col-start-1 [&>*]:row-start-1 [&>*]:col-end-2 [&>*]:w-full isolate">
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={location.pathname}
            role="presentation"
            className="motion-page-root"
            initial={
              reduceMotion ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.992 }
            }
            animate={
              reduceMotion
                ? { opacity: 1 }
                : {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: enterDur, ease: EASE_PAGE },
                  }
            }
            exit={
              reduceMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    y: -14,
                    scale: 0.99,
                    transition: { duration: exitDur, ease: EASE_PAGE },
                  }
            }
            style={{
              willChange: reduceMotion ? 'opacity' : 'opacity, transform',
            }}
          >
            <Suspense fallback={<PageFallback />}>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/recipes" element={<Recipes />} />
                <Route path="/recipes/fridge" element={<FridgeSearch />} />
                <Route path="/recipes/detail/:id" element={<RecipeDetail />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/detail/:id" element={<BlogDetail />} />
                <Route path="/health" element={<Health />} />
                <Route path="/health/detail/:id" element={<HealthDetail />} />
                <Route path="/profile" element={<Profile />} />
                {/* Marketplace */}
                <Route path="/shop" element={<Shop />} />
                <Route path="/shop/:slug" element={<ProductDetail />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:id" element={<OrderDetailPage />} />
                <Route path="/seller" element={<SellerDashboard />} />
                <Route path="/seller/settings" element={<SellerSettings />} />
                <Route path="/wallet" element={<CookPayWallet />} />
                <Route path="/seller/wallet" element={<CookPayWallet />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/creator/:id" element={<PublicProfile />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
    </CartProvider>
  );
}
