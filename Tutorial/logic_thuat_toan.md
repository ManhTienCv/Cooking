# 🧠 Cẩm Nang: Logic & Giải Thuật Bảo Mật Ứng Dụng Web

Phần này đi sâu vào giải nghĩa thuật toán mà hệ thống sử dụng, đây đều là Design Patterns cực kỳ phổ thông cho lập trình Backend. Nhờ nó hệ thống có thể đối phó với luồng truy cập không tốt từ bên ngoài.

## Mở Đầu: Tại Sao Logic Web Lại Quan Trọng Hơn CRUD thông thường?
Trong lúc code "Thêm Sửa Đọc Hoá" (CRUD) thì rào cản lớn nhất không nằm ở việc ghi dữ liệu (Ai cũng ghi được bằng 1 câu sql nhỏ) - Mà nó nằm ở việc "Liệu dữ liệu chuẩn bị ghi kia có an toàn không?". Nếu như tài khoản đăng ký là BOT máy tự động sinh hàng triệu tài khoản rác 1 giây, Database PostgreSQL sẽ sập máy chủ.
Từ đó, CookingBoy triển khai 4 thuật toán sau chặn đứng.

## Thuật Toán 1: Xác Thực OTP Email Tạm Thời (2FA/OTP Registration Lifecycle)
Thay vì chèn ID thẳng vô CSDL chính `users`, để ép người dùng dùng Mail Thật, logic sinh ra Bảng Tạm Thời `pending_registrations`.
* **Khởi điểm:** Nhận Req gửi -> Server tạo chuỗi Token ngẫu nhiên hàm RandomInt (Hàm của Crypto trong NodeJS, không dùng `Math.random` do đoán được Base Seed).
* **Phân lớp băm kép:** Tránh việc người chặn mạng (MIMT man in the middle track) đọc OTP, cả `OTP` và Mật khẩu đều phải gạch chéo băm ngầm xuống trước khi Insert bảng Tạm. Thuộc tính Timeout gắn cho Nodejs Date hạn là Date.now() + 15 mins.
* **Service Email:** Call tới Nodemailer (Bên thứ 3 làm nhà phân phối).
* **Chốt phiên (Terminal State):** Người dùng POST gửi lại OTP họ thấy trong email lên. Server truy xuất Bảng tạm (Select by Email). Đo đạc Expired Time. So sánh băm `bcrypt.compare`. Nếu Thẻ OTP Trùng = Lục tìm bản ghi của Tạm, Sao in một bản Paste sang bảng `users` Chính Thức, Cuối cùng, huỷ vết cũ ở Bảng Tạm (Hoặc xoá cặn bởi SQL trigger quét rác định kỳ các bảng Tạm hết hạn). 

## Thuật Toán 2: Bảo Vệ Lỗ Hổng CSRF Trong Động Lực Học Fetching
**Cross-Site Request Forgery (CSRF)** hoạt động như sau: Trình duyệt luôn luôn mang Session ID vô Cookie mỗi lần gõ tên miền. Bạn đã login bằng tab này. Nếu hacker đưa bạn click 1 đường link giả, link đó gửi ngầm ajax API `POST /delete-user` lên Server. Server thấy trình duyệt của bạn kèm Cookie hợp lệ, thế là xoá luôn tài khoản của bạn dù bạn không mảy may nghĩ tới thao tác này.
**Cách dự án khắc phục (Kĩ thuật Đồng Bộ Hóa Token Token Synchronizer Pattern):**
* API viết hàm `ensureCsrfToken` sinh ra chuỗi mật khẩu thứ cấp ngẫu nhiên đặt vô Header yêu cầu Client phải mang mỗi lần gõ API Mutation (POST/PUT/DEL).
* Hacker dù có lừa người dùng click cái link ở bên web Độc, trình duyệt nạn nhân có Cookie gửi dính theo (Server xác nhận đăng nhập), nhưng Web Độc không thể truy xuất hay ăn trộm cái "Chuỗi mật khẩu thứ cấp Header" nên request Mutation không làm nên trò trống, bị Server từ chối lệnh 403 Forbidden CSRF Mismatch.

## Thuật Toán 3: Giới Hạn Luồng Đi Cảng (Rate Limiting Check)
Đây là logic chống kĩ thuật Tấn công Tử Địa (Brute Force/DDos):
Express tích hợp thuật toán "Bucket Leaky" / Windows Log. Bằng cách đong đếm Request Headers dựa theo số IP gửi lại liên tục.
Trình quản lý khai báo (ở file rateLimits):
```javascript
export const authLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // Chu kỳ quét 15 phút
  max: 5, // Tối đa sai 5 lần. Nếu vuợt mức -> Trả 429 Too Many Requests
  message: "Try again later",
})
```
Nếu 1 IP tấn công hàng loạt, Cấu kiện Rate Limit này sẽ đếm được trong RAM của Node. Ngay lập tức block không cho phép Request ấy rơi lọt xuống tầng Database. -> Ngăn Database không bị sụp. 
Tương tự cho cả gửi AuthForgot (2 Req/tiếng) để chống hành vi gửi làm tắc nghẽn server mail của hệ thống (SMTP giới hạn số mail / day).
