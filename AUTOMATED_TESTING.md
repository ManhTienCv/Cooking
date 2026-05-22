# Hướng Dẫn Chạy Kiểm Thử Tự Động (E2E Automated Testing Guide)

Tài liệu này cung cấp chi tiết về cơ chế bypass bảo mật (Rate Limits, OTP) và các kịch bản kiểm thử tự động dành cho AI Test Runner hoặc các công cụ kiểm thử như Playwright, Cypress, Selenium.

---

## 1. Cơ Chế Bypass Kiểm Thử (Testing Bypass Mechanisms)

Để chạy kiểm thử liên tục với tần suất cao (spam request) mà không bị hệ thống chặn hoặc yêu cầu xác thực OTP qua Email thực tế, bạn cần cấu hình các thông số sau:

### A. Bypass Giới Hạn Tần Suất (Rate Limiting Bypass)
Tất cả các API giới hạn tần suất (như Login, Register, Request OTP, Create Order, Post Product) đã được thiết lập để bỏ qua kiểm tra nếu request có chứa:
* **HTTP Header**: `X-Test-Bypass: true` hoặc `X-Test-Bypass: <MÃ_OTP_TEST>` (ví dụ: `000000`)
* **Môi trường**: Khi chạy trong môi trường test (`NODE_ENV=test`).

> [!IMPORTANT]
> **Yêu cầu đối với AI Test Runner / Automation Script:**
> Mọi yêu cầu HTTP gửi từ Script kiểm thử đến API server đều nên đính kèm Header:
> ```http
> X-Test-Bypass: true
> ```

---

### B. Bypass Xác Thực Mã OTP (OTP Verification Bypass)
Mã OTP được gửi cho đăng ký tài khoản, đổi mật khẩu, thao tác bảo mật của người bán và giao dịch ví điện tử có thể được nhập cố định thông qua cấu hình trong file `.env` của API server.

* **Mã OTP Test mặc định:** `000000` (được cấu hình qua biến `TEST_OTP_CODE` trong file `.env` của API).
* **Quy tắc hoạt động:** Khi nhập bất cứ form OTP nào (đăng ký, nạp tiền, rút tiền, thêm ngân hàng), chỉ cần gửi mã OTP là `000000` (hoặc giá trị cấu hình tương đương) là hệ thống sẽ xác thực thành công ngay lập tức.
* **Gửi OTP qua email:** Khi thực hiện kiểm thử tự động, hệ thống sẽ tự động bỏ qua việc gửi email SMTP/Brevo thật đối với các email test có phần mở rộng tên miền như:
  * `@test.com` (ví dụ: `user@test.com`)
  * `@localhost`
  * `.local` hoặc `.test`
  * Bắt đầu bằng `test+...`, `autotest+...`, `verify_...`

---

## 2. Kịch Bản & Quy Trình Kiểm Thử Chi Tiết (E2E Test Workflows)

Dưới đây là các bước viết mã kiểm thử tự động cho các luồng chính của ứng dụng:

### Kịch Bản 1: Đăng ký & Đăng nhập tài khoản
1. **Đăng ký tài khoản:**
   * Gửi request `POST /api/auth/register/otp` để yêu cầu gửi mã OTP cho email dạng `test+user@test.com`.
   * Gửi request `POST /api/auth/register` với OTP là `000000` để hoàn tất việc đăng ký.
2. **Đăng nhập:**
   * Gửi request `POST /api/auth/login` với email và mật khẩu vừa tạo để lấy Cookie phiên đăng nhập (session cookie).

### Kịch Bản 2: Thiết lập tài khoản Người bán (Seller Settings)
1. **Cập nhật địa chỉ:**
   * Cập nhật địa chỉ mặc định trong profile của Buyer. Hệ thống sẽ tự động đồng bộ sang bảng `seller_profiles` của Người bán.
2. **Thêm ngân hàng thụ hưởng (Payout Account):**
   * Truy cập mục "Tài khoản ngân hàng" trong cài đặt Người bán.
   * Chọn ngân hàng từ danh sách dropdown gợi ý (gọi từ API VietQR `https://api.vietqr.io/v2/banks`).
   * Xác thực bảo mật người bán bằng cách nhập mật khẩu và gửi OTP (sử dụng mã OTP mặc định `000000`).

### Kịch Bản 3: Giao Dịch Ví Điện Tử Cook (E-Wallet & Payments)
1. **Liên kết tài khoản ngân hàng cá nhân:**
   * Thêm tài khoản ngân hàng trong trang hồ sơ cá nhân.
   * Gửi OTP xác thực và hoàn tất (sử dụng OTP `000000`).
2. **Nạp tiền ví điện tử Cook (Topup):**
   * Nạp tiền từ ngân hàng liên kết vừa thêm (với số tiền test).
   * Đối với giao dịch từ `5.000.000đ` trở lên, hệ thống yêu cầu mã OTP bảo mật. Nhập OTP `000000` để hoàn thành.
3. **Thanh toán đơn hàng (Cook Wallet Payment):**
   * Đặt mua sản phẩm qua phương thức thanh toán **Ví Cook**.
   * Hệ thống tự động khấu trừ số dư ví và cập nhật trạng thái đơn hàng thành `paid` (đã thanh toán) và tự động xác nhận đơn sau 2 phút nếu chưa được người bán duyệt thủ công.

---

## 3. Ví Dụ Cấu Hình Bypass Header Trên Các Công Cụ E2E (E2E Bypass Header Configurations)

Để hệ thống bỏ qua giới hạn tần suất (Rate Limiting) và kích hoạt chế độ test, bạn cần cấu hình công cụ kiểm thử tự động gửi kèm HTTP Header `X-Test-Bypass: true`.

### A. Playwright (TypeScript / JavaScript)

Cấu hình trực tiếp trong file `playwright.config.ts` để áp dụng cho mọi request của trình duyệt:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Tự động đính kèm bypass header cho tất cả browser requests
    extraHTTPHeaders: {
      'X-Test-Bypass': 'true',
    },
    baseURL: 'http://localhost:5173',
  },
});
```

Hoặc thiết lập trong từng kịch bản kiểm thử riêng lẻ:

```javascript
// Thêm header bypass trực tiếp cho một trang cụ thể
await page.setExtraHTTPHeaders({
  'X-Test-Bypass': 'true'
});
```

### B. Java + Selenium 4 (Sử dụng Chrome DevTools Protocol - CDP)

Do Selenium WebDriver không hỗ trợ thêm HTTP Headers trực tiếp khi điều hướng (`driver.get()`), cách tối ưu và độc lập nhất là sử dụng **Chrome DevTools Protocol (CDP)** có sẵn trong **Selenium 4** để can thiệp vào tầng Network:

```java
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import java.util.HashMap;
import java.util.Map;

public class SeleniumBypassTest {
    public static void main(String[] args) {
        // 1. Cấu hình Chrome Options
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--remote-allow-origins=*");
        
        ChromeDriver driver = new ChromeDriver(options);
        
        try {
            // 2. Kích hoạt Network và gán HTTP Header bypass thông qua CDP
            Map<String, Object> headers = new HashMap<>();
            headers.put("X-Test-Bypass", "true");
            
            Map<String, Object> params = new HashMap<>();
            params.put("headers", headers);
            
            // Kích hoạt tính năng can thiệp network
            driver.executeCdpCommand("Network.enable", new HashMap<>());
            // Gán thêm header mặc định cho mọi request từ trình duyệt
            driver.executeCdpCommand("Network.setExtraHTTPHeaders", params);
            
            // 3. Tiến hành kiểm thử bình thường
            driver.get("http://localhost:5173");
            
            // Viết các bước kiểm thử của bạn ở đây...
            
        } finally {
            driver.quit();
        }
    }
}
```

---

## 4. Lưu Ý Quan Trọng Khi Kiểm Thử Với Java + Selenium (Java + Selenium Best Practices)

Khi triển khai viết kịch bản kiểm thử tự động bằng Java + Selenium trên dự án này, hãy lưu ý các điểm sau để tránh kiểm thử bị chập chờn (flaky tests):

### A. Quản lý Trình Duyệt và Driver
* **Selenium Manager (Tự Động)**: Từ Selenium 4.6.0 trở đi, thư viện đã tích hợp sẵn Selenium Manager. Bạn không cần tải thủ công `chromedriver.exe` hay khai báo `System.setProperty("webdriver.chrome.driver", ...)` nữa. Selenium sẽ tự động tải và quản lý phiên bản driver tương thích với Chrome đang cài trên máy.
* **Chạy Headless trên CI/CD**: Khi chạy kiểm thử tự động trên GitHub Actions hoặc các môi trường server không có giao diện, hãy bật chế độ headless:
  ```java
  options.addArguments("--headless=new");
  options.addArguments("--disable-gpu");
  options.addArguments("--no-sandbox");
  options.addArguments("--disable-dev-shm-usage");
  ```

### B. Cơ Chế Chờ Đợi Động (Explicit Wait)
Do giao diện Web sử dụng **React (Vite)** tải dữ liệu bất đồng bộ từ Backend API, tuyệt đối **không sử dụng** `Thread.sleep(...)` để chờ tải trang. Thay vào đó, hãy sử dụng `WebDriverWait` để chờ phần tử xuất hiện:
```java
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.By;
import java.time.Duration;

// Khởi tạo WebDriverWait (chờ tối đa 10 giây)
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));

// Chờ nút đăng nhập hiển thị và click được trước khi click
wait.until(ExpectedConditions.elementToBeClickable(By.id("login-submit-button"))).click();

// Chờ form OTP xuất hiện
wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("otp-input-field")));
```

### C. Thiết Lập Page Object Model (POM)
Để giữ mã nguồn kiểm thử sạch và dễ bảo trì khi UI thay đổi, hãy tổ chức mã nguồn theo mô hình **Page Object Model (POM)**.
* Mỗi trang hoặc component (như Login, Cart, SellerDashboard) là một Class riêng.
* Khai báo các Selector/Locator và các hành động tương ứng trong Class đó, không viết trực tiếp trong Class chạy test.

### D. Xử Lý Các Thành Phần Đè Lên Nhau (Overlays / Modals)
Trong ứng dụng, khi click các nút thanh toán hoặc đăng nhập, có thể có Loading Spinner hoặc Modal chặn tương tác của chuột. Hãy sử dụng Explicit Wait để chờ loading biến mất trước khi thao tác tiếp:
```java
// Chờ Loading Spinner biến mất hoàn toàn
wait.until(ExpectedConditions.invisibilityOfElementLocated(By.className("loading-spinner")));
```
