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
├── web/              # Mã nguồn Frontend.
│   ├── src/          
│   │   ├── components/ # Các Component dùng chung (UI chia nhỏ)
│   │   ├── lib/        # Các hàm tiện ích, cấu hình gọi API.
│   │   ├── pages/      # Chứa các màn hình (Home, Recipes, Blog, Auth, Admin...).
│   │   └── App.tsx     # Định tuyến (Routing) chính của ứng dụng.
├── api/              # Mã nguồn Backend.
│   ├── src/
│   │   ├── db/         # Cấu hình kết nối tới PostgreSQL (Pool connect).
│   │   ├── lib/        # Tiện ích bổ sung (Rate Limit, Captcha, Audit log).
│   │   ├── middleware/ # Các tệp filter trước khi vào logic chính (CSRF, Auth check).
│   │   ├── routes/     # Chứa API Endpoints tương ứng phân nhánh theo modules.
│   │   ├── services/   # Dịch vụ gọi bên thứ 3 (Gửi Email OTP...).
│   │   └── index.ts    # File khởi chạy máy chủ Express.
├── database/         # Nơi lưu trữ mã SQL Schema.
│   └── postgresql_schema.sql  # Định nghĩa các bảng, trigger.
└── Tutorial/         # Tập hợp các tài liệu hướng dẫn kỹ thuật này.
```

## 4. Các Module Tính Năng Chính
- **Auth (Xác thực):** Luồng đăng ký nghiêm ngặt hỗ trợ mã OTP xác minh qua Email thực, đăng nhập bảo mật có rào cản bruteforce, tích hợp ReCaptcha v2. 
- **Recipes (Công thức):** Xem danh sách công thức, lọc theo danh mục, độ khó, thời gian hoàn thành. Chi tiết công thức nấu.
- **Health (Sức khỏe):** Module cung cấp số liệu dinh dưỡng, kiến thức cho một lối sống lành mạnh.
- **Blog (Bài viết):** Nơi admin/user đăng tải các mẹo vặt nhà bếp.
- **Admin Dashboard (Sắp ra mắt/Quản trị):** Phân hệ dành riêng cho admin để duyệt bài, quản lý thành viên.
