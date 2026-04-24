import { useLayoutEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

import Layout from './components/Layout';
import { scrollWindowToTop } from './lib/scroll';
import Home from './pages/Home';
import About from './pages/About';
import Recipes from './pages/Recipes';
import RecipeDetail from './pages/Recipes/Detail';
import Blog from './pages/Blog';
import BlogDetail from './pages/Blog/Detail';
import Health from './pages/Health';
import HealthDetail from './pages/Health/Detail';
import Profile from './pages/Profile';
import AdminLogin from './pages/Admin/Login';
import AdminLayout from './pages/Admin/Layout';
import DashboardTab from './pages/Admin/tabs/DashboardTab';
import ApprovalsTab from './pages/Admin/tabs/ApprovalsTab';
import UsersTab from './pages/Admin/tabs/UsersTab';
import RecipesTab from './pages/Admin/tabs/RecipesTab';
import BlogsTab from './pages/Admin/tabs/BlogsTab';
import FeedbackTab from './pages/Admin/tabs/FeedbackTab';
import CommentsTab from './pages/Admin/tabs/CommentsTab';
import CategoriesTab from './pages/Admin/tabs/CategoriesTab';

const EASE_PAGE = [0.22, 1, 0.36, 1] as const;

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const reduceMotion = useReducedMotion();

  /* location.key đổi mỗi lần navigate → luôn cuộn về đầu (kể cả bấm lại cùng mục nav) */
  useLayoutEffect(() => {
    scrollWindowToTop();
  }, [location.key, location.pathname]);

  if (isAdminRoute) {
    return (
      <>
        <Toaster position="top-right" />
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
        </Route>
      </Routes>
      </>
    );
  }

  const enterDur = reduceMotion ? 0.12 : 0.56;
  const exitDur = reduceMotion ? 0.1 : 0.44;

  return (
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
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/recipes/detail/:id" element={<RecipeDetail />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/detail/:id" element={<BlogDetail />} />
              <Route path="/health" element={<Health />} />
              <Route path="/health/detail/:id" element={<HealthDetail />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
}
