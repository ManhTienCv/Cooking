# 📘 CookingBoy - Giới Thiệu Tổng Quan Dự Án

Chào mừng bạn đến với tài liệu kỹ thuật của **CookingBoy** - một ứng dụng web toàn diện hỗ trợ quản lý, chia sẻ công thức nấu ăn, theo dõi sức khỏe và kết nối cộng đồng yêu ẩm thực. 

## 1. Tầm Nhìn Dự Án (Project Vision)
CookingBoy không chỉ là một ứng dụng lưu trữ công thức nấu ăn, mà còn là một diễn đàn nhỏ thu nhỏ để mọi người có thể học cách làm ra một bữa ăn từ cơ bản đến nâng cao. Ứng dụng cung cấp các kiến thức về mặt sức khoẻ thực phẩm, đọc các bài blog đa lĩnh vực nội trợ và quản lý hồ sơ cá nhân với mức độ bảo mật cao.

## 2. Kiến Trúc Hệ Thống (System Architecture)
Dự án được xây dựng theo mô hình **Client-Server (Frontend - Backend tách biệt)** hoàn chỉnh:
* **Frontend (Khách)**: Ứng dụng Single Page Application (SPA) viết bằng React (Vite). Giao tiếp hoàn toàn qua RESTful APIs với Backend. Phụ trách render UI, quản lý state và route độc lập.
* **Backend (Máy chú)**: Ứng dụng Node.js & Express API phục vụ dưới dạng stateless (Session/JWT hybrid), chuyên xử lý logic xác thực, gọi Database, thao tác I/O.
* **Database (Cơ sở dữ liệu)**: Cơ sở dữ liệu quan hệ PostgreSQL quản lý dữ liệu một cách đồng bộ, an toàn, ràng buộc chặt chẽ.

## 3. Cấu Trúc Mã Nguồn (Directory Structure)
Mã nguồn được phân tách minh bạch:
```text
CookingBoy/
├── web/              # Mã nguồn Frontend (ReactJS/Vite)
├── api/              # Mã nguồn Backend (Node.js/Express)
├── database/         # Nơi lưu trữ mã SQL Schema PostgreSQL
├── deploy/           # Cấu hình Docker, Nginx triển khai hệ thống
└── Tutorial/         # Tập hợp các tài liệu hướng dẫn kỹ thuật chi tiết
```

## 4. Các Module Tính Năng Chính
- **Auth (Xác thực):** Luồng đăng ký nghiêm ngặt hỗ trợ mã OTP xác minh qua Email thực, đăng nhập bảo mật có rào cản bruteforce, tích hợp ReCaptcha v2. 
- **Recipes (Công thức):** Xem danh sách công thức, lọc theo danh mục, độ khó, thời gian hoàn thành. Chi tiết công thức nấu.
- **Health (Sức khỏe):** Module cung cấp số liệu dinh dưỡng, kiến thức cho một lối sống lành mạnh.
- **Blog (Bài viết):** Nơi admin/user đăng tải các mẹo vặt nhà bếp.
- **Admin Dashboard (Sắp ra mắt/Quản trị):** Phân hệ dành riêng cho admin để duyệt bài, quản lý thành viên.

## 5. Tài Liệu Hướng Dẫn Kỹ Thuật (Documentation)
Để đi sâu vào chi tiết cách cài đặt, chạy dự án và hiểu các luồng thuật toán, mời bạn tham khảo các tài liệu trong thư mục `Tutorial`:
- 🛠️ [Công Cụ Sử Dụng (cong_cu.md)](./Tutorial/cong_cu.md)
- 🚀 [Hướng Dẫn Cài Đặt & Sử Dụng (huong_dan_su_dung.md)](./Tutorial/huong_dan_su_dung.md)
- 🧠 [Logic & Thuật Toán (logic_thuat_toan.md)](./Tutorial/logic_thuat_toan.md)
- 🎨 [Thành Phần Giao Diện Frontend (tags_fe.md)](./Tutorial/tags_fe.md)
- 🔌 [Hàm API & Lệnh Backend (ham_cau_lenh_be.md)](./Tutorial/ham_cau_lenh_be.md)
- 🗄️ [Triển Khai CSDL PostgreSQL (cau_lenh_sql.md)](./Tutorial/cau_lenh_sql.md)
