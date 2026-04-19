# 🎓 Phân Tích Chuyên Sâu Từng Công Tụ Học Tập (Tech Stack Analysis)

Tài liệu này giải thích rõ **lí do và lợi ích** tại sao trong dự án này ta lại chọn nhóm công nghệ này chứ không phải công nghệ khác. Đây là kiến thức bản lề giúp bạn trả lời phỏng vấn (Interview).

## 1. Ngôn Ngữ: TypeScript thay vì JavaScript thuần
**Tại sao cần học?** JS có một khuyết điểm là "Ký kiểu động" (Dynamic typing). Ví dụ hàm yêu cầu Cộng 2 số `a + b`, bạn vô tình ném vô một chuỗi chữ số thay vì con số `1 + '2'` nó sẽ ra `'12'`. Do JS không báo lỗi trong lúc code mà sẽ phát sinh bug khi chạy thực tế (Runtime-error). 
**Ưu thế:** TypeScript bọc bên ngoài JS, buộc bạn phải khai báo rõ `a: number, b: number`. Nếu bạn nhập sai kiểu, Trình soạn thảo (VSCode) gạch đỏ ngay lập tức (Compile-time error). Cách này giúp luồng dữ liệu ổng định và dự tính được đầu ra.

## 2. Giao Diện: Tại Sao Gọi React Là Một SPA?
**Single Page Application (SPA):** Khác biệt rõ nhất giữa React (Hiện đại) và PHP thuần hồi xưa (Truyền thống). 
- Ở kiểu truyền thống: Khi bạn bấm qua trang Blog, trình duyệt gửi HTTP fetch, Server gửi toàn bộ một file HTML mới, màn hình chớp trắng 1 cái rồi load lại (Multi-page).
- Ở React/SPA: Project này chỉ tải duy nhất 1 trang `index.html` trong nguyên vòng đời của nó. Khi bạn dùng thẻ `<Link to="/blog">` (React Router), Javascript ngầm tự xoá cấu trúc DOM HTML đang có (giao diện Home) và Vẽ (Render) ra DOM HTML mới toanh (giao diện Blog) trên chính cái khung của trang đó mà bạn không hề nhận thấy sự tải lại trang nào (không bị load rỗng trang). 
- => **Bài Học:** Trải nghiệm người dùng (UX) giống như dùng 1 App mượt mà, nhưng ngược lại thiết bị khách (CPU, RAM máy người dùng) sẽ tải và xử lý tính toán đồ họa thay cho Server.

## 3. Công Cụ CSS: Tailwind CSS (Utility-First)
CSS truyền thống phải đẻ ra file `style.css`, đặt class `.nav-bar`, sau đó nhảy qua HTML gọi `<div class="nav-bar">`. Cách này khiến việc đồng bộ rất khổ với các dự án siêu to, file css cứ phình lên hoặc lố code dư thừa.
**TailwindCSS** quy luật "tiện ích thu nhỏ" nhét thẳng vào `class=""`. Tính module siêu cao. Code React ở đâu là design giao diện bám chặt theo sát ở đó. Không rác code dư thừa CSS khi build Production do nó có khả năng nén rác (Tree-shaking class nào không xài).

## 4. Máy Chủ Backend: Node.js & Express.js
**Bài Học Kiến Trúc Stateless:** Backend NodeJS của dự án có ưu thế vượt trội là Non-blocking I/O (Luồng sự kiện không chặn).
Ví dụ: Bạn có 5 request truy xuất DB, thay vì PHP đợi thực thi xong req1 mới mở cổng nhận cho req2. NodeJS nhận tuốt 5 req rồi ném luồng trích xuất dữ liệu qua DB xử lý ngầm, và Node lại đứng đợi sẵn sàng nghênh tiếp req thứ 6. Khi db trả output về req2 xong, Node lập tức phản hồi (Callback) gửi req2 lên cho Khách hàng. Node chạy theo hướng bất đồng bộ (Asynchronous) xử lí được nhiều yêu cầu trong 1 đơn vị thời gian. Express là bộ khung chuẩn hóa cho Node để viết Router dễ nhìn.

## 5. Middleware Auth: Vì sao cần Thư viện Mã Hóa (Bcrypt) & Rào CSRF?
- **Bcrypt**: Băm bằng MD5 / SHA256 thì ngày nay bị bắt bẻ cực nhanh nhờ vào Bảng dò phần cứng máy cực mạnh. Bcrypt đi kèm khái niệm **Salt** (Rắc Muối), sinh ra 1 đoạn String ảo gắn trộn ngẫu nhiên vô Pass gốc, khiến cùng 1 password `123456` mà mỗi User lại băm ra 1 chuỗi dài ngoằn ngoèo y hệt và không thể dò mã ngược (Decryption is impossible). 
- **CSRF Token**: Là một chuỗi ký tự mà Client lấy từ API của ta trên Session bảo mật. Nhờ chuỗi này, kể cả khi nạn nhân bị chèn iframe / tab link độc ở bên ngoài để click câu lệnh (Cross Site), trình duyệt hacker vẫn không có Token để POST thay cho nạn nhân.

## 6. Cơ Sở Dữ Liệu SQL (PostgreSQL vs MongoDB NoSQL)
CookingBoy là ứng dụng có các Object Ràng Buộc: 1 Người dùng (Users) - viết nhiều Bình Luận (Comments) và thuộc nhiều Bài Công Thức (Recipes). Mạch dữ liệu này có dạng **Quan Hệ (Relational)**. Bạn phải đảm bảo khi Xóa 1 người dùng thì toàn bộ công thức và bình luận cũng vỡ theo hoặc bị huỷ đính kèm. 
PostgreSQL sử dụng bảng (Tables) có tính toán Nguyên tử (ACID compliance transaction). Phù hợp tuyệt đối với nền tảng tài chính, thương mại, hồ sơ cố định, thay vì NoSQL chỉ là Json Documents.
