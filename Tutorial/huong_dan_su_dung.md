# 📚 Hướng Dẫn Thiết Lập & Chạy Dự Án (Study Guide)

Tài liệu này không chỉ cung cấp các bước cài đặt mà còn đóng vai trò là một tài liệu học tập để bạn hiểu rõ **tại sao** chúng ta lại phải làm các bước này khi khởi chạy một dự án Full-Stack.

## 1. Môi trường Thực Thi (Runtime Environments)
Bất kỳ mã nguồn nào cũng cần một "cỗ máy" để đọc và chạy nó.
* **Node.js**: Máy tính của bạn ban đầu chỉ hiểu được mã máy (Machine code) hoặc C/C++. Node.js được lấy từ lõi V8 (của Google Chrome) để dịch trực tiếp ngôn ngữ JavaScript thành mã máy mà không cần trình duyệt.
* **PostgreSQL (Local DB)**: Là một service (dịch vụ phần mềm) chạy ngầm trong máy 24/24. Nhiệm vụ của nó là lắng nghe các lệnh truy vấn (SQL queries) từ máy chủ Node.js và trả về dữ liệu.

## 2. Giải Mã File Biến Môi Trường (`.env`)
Khi học lập trình, bạn sẽ nghe rất nhiều về `.env`. Dưới đây là ý nghĩa của nó:
* **Tính bảo mật:** Mọi mã nguồn đưa lên GitHub đều mang tính công khai (public). Nếu bạn ghi thẳng Mật khẩu Database vào code, ai cũng sẽ thấy. File `.env` sẽ chứa các chuỗi nhạy cảm và nó *Luôn luôn bị đưa vào mục bỏ qua (Ignored)* qua `.gitignore`.
* **Tính linh hoạt:** Ở máy bạn chạy Port 3000, nhưng ở máy lên mạng chạy Port 80. Khi thay đổi chỉ cần sửa file `.env` một lần duy nhất.

Cấu trúc file `.env` chuẩn phục vụ cho Backend học tập:
```ini
# --- CẤU HÌNH SERVER KẾT NỐI ---
PORT=3000
# DB Cục Bộ luôn là 127.0.0.1 hoặc localhost
DB_HOST=localhost 
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=12345
DB_NAME=cookingboy

# --- CẤU HÌNH DỊCH VỤ SMTP EMAIL ---
# (Cấu hình này để bạn luyện tập dùng máy chủ Google tự gửi mail OTP)
SMTP_HOST=smtp.gmail.com
SMTP_USER=testmail@gmail.com
# Lưu ý: Đây là App Password (Mật khẩu ứng dụng 16 ký tự của Google), không phải Pass gốc.
SMTP_PASS=xxxx xxxx xxxx xxxx
```

## 3. Quá Trình Build & Chạy Server (Workflow Học Tập)
Khi thực hiện chạy lệnh `npm install` và `npm run dev`, đằng sau nó là cơ chế sau:

### Phân Hệ DB
1. **Thiết lập Khung (Schema)**: CSDL ban đầu rỗng. Bạn phải chạy thủ công file `database/postgresql_schema.sql` vào pgAdmin. Đây là bước **khởi tạo**. Bạn đang ra lệnh cho RDBMS cấp trước ranh giới cột, kiểu dữ liệu (varchar, timestamp) để nó biết cách lưu trữ sau này.

### Phân Hệ Backend (API)
2. `cd api` và `npm install`: Lệnh này sẽ mở tệp `package.json` xem dự án này đang nợ/thiếu những thư viện mở rộng nào, sau đó tải toàn bộ chúng cất vào thư mục khổng lồ `node_modules`. Khung xương (Express, pg, bcrypt) đã sẵn sàng.
3. `npm run dev`: Đây là một script được khai báo do lập trình viên cấu hình. Đối với NodeJS hiện đại, thường ta dùng thư viện `tsx` hoặc `nodemon` để: "Khởi động máy chủ, và nếu tôi có lỡ nhấn Ctrl+S lưu file đổi dòng code, hãy tự Tắt và Mở lại Server cho tôi (Hot-reload) để lấy code mới nhất". Nếu không có nó, mỗi lần test lại API bạn phải tự bấm Dừng và Khởi động lại bằng tay rườm rà.

### Phân Hệ Frontend (Web)
4. Tương tự, qua tab terminal khác gõ `cd web`, `npm install` để tải thư viện Front-end (React, Tailwind..). 
5. `npm run dev`: Lệnh này khác với ở BE. Ở FE, Vite Bundler (Máy chủ biên dịch dạng phát triển) sẽ dịch các file *.tsx và SCSS gom cục lại thành một giao diện HTML / JS ảo trên RAM. Sau đó đẩy lên trình duyệt (Port 5173).  

## 4. Troubleshooting (Gỡ Rỗi Thường Gặp Khi Học)
Là người học, nếu Server sập gãy giữa chừng, bạn nên check các dòng sau:
- **Lỗi `ECONNREFUSED 127.0.0.1:5432`**: Có nghĩa là Node.js không thể bấm gõ cửa Database. Giải pháp: Mở Service (Services.msc) trên windows xem `postgresql-x64-15` có đang chọn chế độ "Running" không?. 
- **Lỗi `password authentication failed for user "postgres"`**: Bạn điền sai mật khẩu nối DB ở `.env`. Sửa lại và chạy lại server.
- **Lỗi `[PARSE_ERROR] Unexpected token` ở Vite**: Do sai cấu trúc cú pháp (dấu ngoặc `}`, `{`) ở Frontend Code. Hãy dò lại số lượng ngoặc đã đóng/mở.
