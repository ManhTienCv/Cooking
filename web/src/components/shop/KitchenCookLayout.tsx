import React from 'react';
import KitchenCookNavbar from './KitchenCookNavbar';
import KitchenCookFooter from './KitchenCookFooter';
import FloatingChatWidget from '../chat/FloatingChatWidget';

interface KitchenCookLayoutProps {
  children: React.ReactNode;
}

export default function KitchenCookLayout({ children }: KitchenCookLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAF7F2] dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-vietnam transition-colors duration-300">
      {/* 1. Header độc lập chuẩn ảnh mẫu KitchenCook */}
      <KitchenCookNavbar />

      {/* 2. Nội dung các trang bán hàng KitchenCook */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* 3. Footer độc lập phong cách đồ bếp Châu Âu */}
      <KitchenCookFooter />

      {/* 4. Live Chat CSKH nổi góc phải */}
      <FloatingChatWidget />
    </div>
  );
}
