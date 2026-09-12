/**
 * Quản lý dynamic Document Title và Favicon tương ứng theo từng route & phân hệ
 * (CookingBoy, KitchenCook Store, Admin Portal)
 */

export function getPageTitle(pathname: string): string {
  // 1. Phân hệ Quản Trị Hệ Thống (Admin Portal)
  if (pathname === '/admin/login') {
    return 'Đăng nhập Quản trị | CookingBoy & KitchenCook';
  }
  if (pathname.startsWith('/admin')) {
    if (pathname.includes('/dashboard')) return 'Tổng quan hệ thống | Admin Portal';
    if (pathname.includes('/approvals')) return 'Duyệt bài đăng | Admin Portal';
    if (pathname.includes('/users')) return 'Quản lý người dùng | Admin Portal';
    if (pathname.includes('/recipes')) return 'Quản lý công thức | Admin Portal';
    if (pathname.includes('/blogs')) return 'Quản lý diễn đàn | Admin Portal';
    if (pathname.includes('/comments')) return 'Quản lý bình luận | Admin Portal';
    if (pathname.includes('/categories')) return 'Quản lý danh mục | Admin Portal';
    if (pathname.includes('/feedback')) return 'Phản hồi người dùng | Admin Portal';
    if (pathname.includes('/market-products')) return 'Quản lý sản phẩm | Admin Portal';
    if (pathname.includes('/market-orders')) return 'Quản lý đơn hàng | Admin Portal';
    return 'Quản trị hệ thống | Admin Portal';
  }

  // 2. Phân hệ Cửa Hàng Đồ Bếp KitchenCook
  if (pathname === '/shop') {
    return 'KitchenCook - Dụng cụ nhà bếp cao cấp';
  }
  if (pathname === '/shop/products') {
    return 'KitchenCook - Tất cả sản phẩm & Dụng cụ bếp';
  }
  if (pathname.startsWith('/shop/')) {
    return 'KitchenCook - Chi tiết sản phẩm';
  }
  if (pathname === '/cart') {
    return 'KitchenCook - Giỏ hàng';
  }
  if (pathname === '/checkout') {
    return 'KitchenCook - Thanh toán đơn hàng';
  }
  if (pathname === '/order-success') {
    return 'KitchenCook - Đặt hàng thành công';
  }
  if (pathname === '/orders') {
    return 'KitchenCook - Quản lý đơn hàng';
  }
  if (pathname.startsWith('/orders/')) {
    return 'KitchenCook - Chi tiết đơn hàng';
  }
  if (pathname === '/account' || pathname.startsWith('/account/')) {
    return 'KitchenCook - Tài khoản của bạn';
  }

  // 3. Phân hệ Cổng Công Thức & Cộng Đồng CookingBoy
  if (pathname === '/') {
    return 'CookingBoy - Khám phá Ẩm thực Việt Nam';
  }
  if (pathname === '/recipes') {
    return 'CookingBoy - Công thức món ngon';
  }
  if (pathname === '/recipes/fridge') {
    return 'CookingBoy - Món ngon từ tủ lạnh';
  }
  if (pathname.startsWith('/recipes/detail/')) {
    return 'CookingBoy - Chi tiết công thức';
  }
  if (pathname === '/blog') {
    return 'CookingBoy - Diễn đàn ẩm thực';
  }
  if (pathname.startsWith('/blog/detail/')) {
    return 'CookingBoy - Chi tiết bài viết';
  }
  if (pathname === '/health') {
    return 'CookingBoy - Dinh dưỡng & Sức khỏe';
  }
  if (pathname.startsWith('/health/detail/')) {
    return 'CookingBoy - Kế hoạch dinh dưỡng';
  }
  if (pathname === '/about') {
    return 'CookingBoy - Về chúng tôi';
  }
  if (pathname === '/profile') {
    return 'CookingBoy - Trang cá nhân';
  }
  if (pathname === '/messages') {
    return 'CookingBoy - Hộp thư tin nhắn';
  }
  if (pathname.startsWith('/creator/')) {
    return 'CookingBoy - Kênh sáng tạo ẩm thực';
  }

  return 'CookingBoy - Nền tảng Ẩm thực & Đồ bếp';
}

/**
 * Cập nhật Favicon tương ứng (CookingBoy vs KitchenCook)
 */
export function updateFavicon(pathname: string): void {
  const isKitchen =
    pathname === '/shop' ||
    pathname.startsWith('/shop/') ||
    pathname === '/cart' ||
    pathname === '/checkout' ||
    pathname === '/order-success' ||
    pathname === '/orders' ||
    pathname.startsWith('/orders/') ||
    pathname === '/account' ||
    pathname.startsWith('/account/');

  const targetFavicon = isKitchen ? '/assets/images/favicon-kitchen.svg' : '/assets/images/favicon.svg';

  const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
  if (link && link.getAttribute('href') !== targetFavicon) {
    link.setAttribute('href', targetFavicon);
  }
}

/**
 * Đồng bộ Title và Favicon theo pathname hiện tại
 */
export function syncPageMeta(pathname: string): void {
  if (typeof document === 'undefined') return;
  document.title = getPageTitle(pathname);
  updateFavicon(pathname);
}
