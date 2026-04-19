<div align="center">
  <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" alt="CookingBoy Icon" width="80" height="80">
  <h1>🍳 CookingBoy</h1>
  <p><i>Nền tảng quản lý, chia sẻ công thức ẩm thực và xây dựng lối sống lành mạnh</i></p>
  
  [![React](https://img.shields.io/badge/Frontend-React_Vite-61DAFB?logo=react&logoColor=black)](#)
  [![Node.js](https://img.shields.io/badge/Backend-Node.js_Express-339933?logo=nodedotjs&logoColor=white)](#)
  [![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](#)
</div>

---

## 📖 Giới thiệu (About the Project)
**CookingBoy** không đơn thuần chỉ là một ứng dụng lưu trữ công thức nấu ăn. Đây là một không gian số thu nhỏ được thiết kế tỉ mỉ — nơi kết nối những người đam mê ẩm thực, chia sẻ kiến thức về sức khỏe, dinh dưỡng và cùng nhau học cách tạo ra những bữa ăn từ cơ bản đến chuẩn nhà hàng.

Được xây dựng với kiến trúc hiện đại, CookingBoy hướng tới trải nghiệm mượt mà, bảo mật cao và dễ dàng để mở rộng trong tương lai.

## ✨ Tính năng nổi bật (Key Features)

- 🔐 **Xác thực bảo mật đa tầng:** Đăng ký bằng OTP nhận qua Email thực tế, cơ chế chống Brute-force & tích hợp ReCaptcha v2. Quản lý phiên làm việc linh hoạt bằng Session & JWT hybrid.
- 🥘 **Khám phá công thức đa dạng:** Tìm kiếm, lọc công thức linh hoạt theo danh mục, độ khó hoặc thời gian chế biến. Tối ưu hoá hiển thị chi tiết cho từng món ăn.
- 🥗 **Góc sức khỏe (Health Module):** Cung cấp những kiến thức dinh dưỡng chuẩn xác, thiết thực giúp bạn duy trì một lối sống lành mạnh bền vững.
- ✍️ **Blog & Mẹo vặt:** Không gian chia sẻ những mẹo nhà bếp hay, trải nghiệm thực tế từ các chuyên gia ẩm thực và cộng đồng.
- ⚙️ **Admin Dashboard:** Phân hệ chuyên biệt dành riêng cho Ban quản trị để kiểm duyệt nội dung, quản lý thành viên và theo dõi hoạt động toàn hệ thống.

## 🛠 Công nghệ sử dụng (Tech Stack)

Dự án triển khai theo kiến trúc **Client - Server** tách biệt hoàn toàn nhằm tối ưu hoá hiệu năng và dễ dàng bảo trì:

### Frontend (User Interface)
- **Framework:** ReactJS (khởi tạo với Vite giúp tăng tốc độ build lên nhiều lần).
- **Architecture:** Single Page Application (SPA), render UI cực nhanh, quản lý state và routing độc lập, giao tiếp với backend hoàn toàn qua RESTful API.

### Backend (Server & API)
- **Nền tảng:** Node.js cùng Express.js framework.
- **Bảo mật & Logic:** Stateless server, Authentication chặt chẽ, tối ưu luồng xử lý I/O và lời gọi tới Database.

### Database & Deployment
- **Cơ sở dữ liệu:** PostgreSQL (Relational DB) đảm bảo tính toàn vẹn, đồng bộ và liên kết dữ liệu chặt chẽ nhất.
- **Triển khai:** Sẵn sàng cho môi trường production với cấu hình Docker & Nginx tích hợp trong thư mục `deploy`.

## 📁 Cấu trúc thư mục (Directory Structure)
Sự rõ ràng và rành mạch là ưu tiên hàng đầu trong cấu trúc mã nguồn của CookingBoy:

```text
CookingBoy/
├── api/              # Mã nguồn Backend (Node.js, Express API)
├── database/         # Các script, schema SQL dành cho PostgreSQL
├── deploy/           # Cấu hình triển khai hệ thống (Docker, Nginx)
├── Tutorial/         # 📚 Không gian lưu trữ tài liệu kỹ thuật chi tiết
└── web/              # Mã nguồn Frontend (React, Vite SPA)
```

## 📚 Tài liệu hướng dẫn (Documentation)

Dành cho các lập trình viên hoặc người muốn cài đặt, triển khai dự án về môi trường nội bộ. Vui lòng tham khảo bộ tài liệu toàn diện được chuẩn bị kỹ lưỡng:

| 📑 Tài liệu | 📝 Mô tả chi tiết |
| :--- | :--- |
| 🛠️ [Công Cụ Sử Dụng](./Tutorial/cong_cu.md) | Tổng hợp các phần mềm, package và công cụ cần thiết để phát triển |
| 🚀 [Hướng Dẫn Cài Đặt](./Tutorial/huong_dan_su_dung.md) | Các bước setup, khởi chạy Frontend & Backend trên môi trường Local |
| 🧠 [Logic & Thuật Toán](./Tutorial/logic_thuat_toan.md) | Phân tích chi tiết quy trình xác thực, luồng bảo mật và thuật toán |
| 🎨 [Kiến Trúc Frontend](./Tutorial/tags_fe.md) | Định hướng thiết kế các thành phần giao diện, Component trong ReactJS |
| 🔌 [Tài Liệu API Backend](./Tutorial/ham_cau_lenh_be.md) | Danh sách cụ thể Endpoint, mô tả luồng hoạt động của các hàm backend |
| 🗄️ [Triển Khai Database](./Tutorial/cau_lenh_sql.md) | Hướng dẫn thao tác, cài đặt cấu trúc PostgreSQL và các câu lệnh SQL mẫu |

---
<div align="center">
  <sub>Được xây dựng với ❤️ nhằm mang lại trải nghiệm ẩm thực số tuyệt vời nhất.</sub>
</div>
