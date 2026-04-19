// Simplified BlackWhite Auth - minimal JavaScript, forms handled by PHP
/**
 * Tên file: BlackwhiteAuth.js
 * Công dụng: Quản lý Modal xác thực (Login/Register).
 * Chức năng: 
 * - Hiển thị/Ẩn modal đăng nhập.
 * - Chuyển đổi giữa các form: Login, Register, Forgot Password.
 * - Xử lý logic hiển thị UI (animation).
 */
const BlackWhiteAuth = {
    overlay: null,
    container: null,

    init() {
        this.createModal();
        this.bindEvents();
    },

    createModal() {
        if (document.getElementById('blackwhiteAuthOverlay')) return;

        this.overlay = document.createElement('div');
        this.overlay.id = 'blackwhiteAuthOverlay';
        this.overlay.className = 'blackwhite-auth-overlay';
        this.overlay.innerHTML = `
            <div class="blackwhite-container" id="blackwhiteContainer">
                <div class="blackwhite-form-container blackwhite-sign-up">
                    <form id="blackwhiteRegisterForm" method="POST" action="">
                        <h1>Tạo Tài Khoản</h1>
                        <span>hoặc sử dụng email để đăng ký</span>
                        <input name="full_name" type="text" placeholder="Tên" required />
                        <input name="email" type="email" placeholder="Email" required />
                        <input name="password" type="password" placeholder="Mật khẩu" required />
                        <div class="blackwhite-error" id="blackwhiteRegisterError"></div>
                        <p class="blackwhite-switch">
                            Đã có tài khoản?
                            <a href="#" id="blackwhiteGoLogin">Đăng nhập</a>
                        </p>
                        <button type="submit" name="register_submit" id="blackwhiteRegisterSubmit">Đăng Ký</button>
                    </form>
                </div>
                
                <div class="blackwhite-form-container blackwhite-sign-in">
                    <form id="blackwhiteLoginForm" method="POST" action="">
                        <h1>Đăng Nhập</h1>
                        <span>hoặc sử dụng email và mật khẩu</span>
                        <input name="email" type="email" placeholder="Email" required />
                        <input name="password" type="password" placeholder="Mật khẩu" required />
                        <a href="#" class="blackwhite-forgot" id="blackwhiteForgotLink">Quên mật khẩu?</a>
                        <div class="blackwhite-error" id="blackwhiteLoginError"></div>
                        <p class="blackwhite-switch">
                            Chưa có tài khoản?
                            <a href="#" id="blackwhiteGoRegister">Đăng ký</a>
                        </p>
                        <button type="submit" name="login_submit" id="blackwhiteLoginSubmit">Đăng Nhập</button>
                    </form>
                </div>

                <div class="blackwhite-form-container blackwhite-forgot-password" style="display: none; left:0; width:50%; height: 100%; z-index:10; background:#fff; flex-direction: column; align-items: center; justify-content: center;">
                     <form id="blackwhiteForgotForm" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                        <h1>Quên Mật Khẩu</h1>
                        <span>Nhập email để nhận mã xác thực</span>
                        <input name="email" type="email" placeholder="Email đăng ký" required />
                        <div class="blackwhite-error" id="blackwhiteForgotError"></div>
                        <button type="submit" id="blackwhiteForgotSubmit">Gửi Mã</button>
                        <p class="blackwhite-switch" style="margin-top:15px;">
                            <a href="#" id="blackwhiteBackToLoginFromForgot">Quay lại Đăng nhập</a>
                        </p>
                    </form>
                </div>

                <div class="blackwhite-form-container blackwhite-reset-password" style="display: none; left:0; width:50%; height: 100%; z-index:10; background:#fff; flex-direction: column; align-items: center; justify-content: center;">
                     <form id="blackwhiteResetForm" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                        <h1>Đặt Lại Mật Khẩu</h1>
                        <span>Nhập mã OTP và mật khẩu mới</span>
                        <input name="otp" type="text" placeholder="Mã OTP (6 số)" required />
                        <input name="new_password" type="password" placeholder="Mật khẩu mới" required />
                        <div class="blackwhite-error" id="blackwhiteResetError"></div>
                        <button type="submit" id="blackwhiteResetSubmit">Đổi Mật Khẩu</button>
                        <p class="blackwhite-switch" style="margin-top:15px;">
                            <a href="#" id="blackwhiteBackToLoginFromReset">Quay lại Đăng nhập</a>
                        </p>
                    </form>
                </div>
                
                <div class="blackwhite-toggle-container">
                    <div class="blackwhite-toggle">
                        <div class="blackwhite-toggle-panel blackwhite-toggle-left" style="background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('../assets/images/avatar2.jpg') no-repeat center center; background-size: cover;">
                            <h1>Chào mừng trở lại!</h1>
                            <p>Nhập thông tin cá nhân để sử dụng tất cả tính năng của trang</p>
                            <button type="button" id="blackwhiteLogin">Đăng Nhập</button>
                        </div>
                        <div class="blackwhite-toggle-panel blackwhite-toggle-right" style="background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('../assets/images/avatar3.jpg') no-repeat center center; background-size: cover;">
                            <h1>Xin chào, bạn mới!</h1>
                            <p>Đăng ký với thông tin cá nhân để sử dụng tất cả tính năng của trang</p>
                            <button type="button" id="blackwhiteRegister">Đăng Ký</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        this.container = this.overlay.querySelector('.blackwhite-container');
    },

    bindEvents() {
        // Toggle Buttons
        const registerBtn = this.overlay.querySelector('#blackwhiteRegister');
        const loginBtn = this.overlay.querySelector('#blackwhiteLogin');
        const goRegister = this.overlay.querySelector('#blackwhiteGoRegister');
        const goLogin = this.overlay.querySelector('#blackwhiteGoLogin');

        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.container.classList.add('active'));
        }
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.container.classList.remove('active'));
        }
        if (goRegister) {
            goRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.container.classList.add('active');
            });
        }
        if (goLogin) {
            goLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.container.classList.remove('active');
            });
        }

        // Overlay Close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Forgot Password Elements
        const forgotLink = this.overlay.querySelector('#blackwhiteForgotLink');
        const forgotForm = this.overlay.querySelector('#blackwhiteForgotForm');
        const resetForm = this.overlay.querySelector('#blackwhiteResetForm');
        const backToLogin = this.overlay.querySelector('#blackwhiteBackToLoginFromForgot');

        const signInContainer = this.overlay.querySelector('.blackwhite-sign-in');
        const forgotContainer = this.overlay.querySelector('.blackwhite-forgot-password');
        const resetContainer = this.overlay.querySelector('.blackwhite-reset-password');

        // Toggle Forgot View
        if (forgotLink && signInContainer && forgotContainer) {
            forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                signInContainer.style.display = 'none';
                forgotContainer.style.display = 'flex';
            });
        }

        if (backToLogin && signInContainer && forgotContainer) {
            backToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                forgotContainer.style.display = 'none';
                signInContainer.style.display = ''; // Revert to CSS default (block)
            });
        }

        const backToLoginReset = this.overlay.querySelector('#blackwhiteBackToLoginFromReset');
        if (backToLoginReset && signInContainer && resetContainer) {
            backToLoginReset.addEventListener('click', (e) => {
                e.preventDefault();
                resetContainer.style.display = 'none';
                signInContainer.style.display = ''; // Revert to CSS default (block)
            });
        }

        // --- FORMS ---
        const loginForm = this.overlay.querySelector('#blackwhiteLoginForm');
        const registerForm = this.overlay.querySelector('#blackwhiteRegisterForm');

        // Login Handler
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const emailInput = loginForm.querySelector('input[name="email"]');
                const passwordInput = loginForm.querySelector('input[name="password"]');
                const errorDiv = this.overlay.querySelector('#blackwhiteLoginError');
                const submitBtn = loginForm.querySelector('#blackwhiteLoginSubmit');

                if (!emailInput.value || !passwordInput.value) {
                    if (errorDiv) errorDiv.textContent = 'Vui lòng điền đầy đủ thông tin';
                    return;
                }

                try {
                    if (errorDiv) errorDiv.textContent = '';
                    if (submitBtn) submitBtn.disabled = true;
                    await AuthService.login({
                        email: emailInput.value.trim(),
                        password: passwordInput.value,
                    });
                    this.close();
                    window.location.href = '../home/index.php';
                } catch (error) {
                    if (errorDiv) errorDiv.textContent = error.message;
                } finally {
                    if (submitBtn) submitBtn.disabled = false;
                }
            });
        }

        // Register Handler
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nameInput = registerForm.querySelector('input[name="full_name"]');
                const emailInput = registerForm.querySelector('input[name="email"]');
                const passwordInput = registerForm.querySelector('input[name="password"]');
                const errorDiv = this.overlay.querySelector('#blackwhiteRegisterError');
                const submitBtn = registerForm.querySelector('#blackwhiteRegisterSubmit');

                if (!nameInput.value || !emailInput.value || !passwordInput.value) {
                    if (errorDiv) errorDiv.textContent = 'Vui lòng điền đầy đủ thông tin';
                    return;
                }
                if (passwordInput.value.length < 6) {
                    if (errorDiv) errorDiv.textContent = 'Mật khẩu phải có ít nhất 6 ký tự';
                    return;
                }

                try {
                    if (errorDiv) errorDiv.textContent = '';
                    if (submitBtn) submitBtn.disabled = true;
                    await AuthService.register({
                        full_name: nameInput.value.trim(),
                        email: emailInput.value.trim(),
                        password: passwordInput.value,
                    });
                    this.close();
                    window.location.href = '../home/index.php';
                } catch (error) {
                    if (errorDiv) errorDiv.textContent = error.message;
                } finally {
                    if (submitBtn) submitBtn.disabled = false;
                }
            });
        }

        // Forgot Password Handler
        if (forgotForm) {
            forgotForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const emailInput = forgotForm.querySelector('input[name="email"]');
                const errorDiv = this.overlay.querySelector('#blackwhiteForgotError');
                const submitBtn = forgotForm.querySelector('#blackwhiteForgotSubmit');

                if (!emailInput.value) return;

                try {
                    if (errorDiv) errorDiv.textContent = '';
                    if (submitBtn) submitBtn.disabled = true;
                    submitBtn.textContent = 'Đang gửi...';

                    const formData = new FormData();
                    formData.append('action', 'request_otp');
                    formData.append('email', emailInput.value.trim());

                    const response = await fetch('../../backend/auth/forgot-password.php', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();

                    if (data.success) {
                        // Switch to Reset Form
                        forgotContainer.style.display = 'none';
                        resetContainer.style.display = 'flex';
                        // Pass email to reset form
                        resetForm.dataset.email = emailInput.value.trim();
                        alert(data.message);
                    } else {
                        if (errorDiv) errorDiv.textContent = data.message;
                    }
                } catch (error) {
                    if (errorDiv) errorDiv.textContent = 'Lỗi kết nối: ' + error.message;
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Gửi Mã';
                    }
                }
            });
        }

        // Reset Password Handler
        if (resetForm) {
            resetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const otpInput = resetForm.querySelector('input[name="otp"]');
                const passInput = resetForm.querySelector('input[name="new_password"]');
                const errorDiv = this.overlay.querySelector('#blackwhiteResetError');
                const submitBtn = resetForm.querySelector('#blackwhiteResetSubmit');

                if (!otpInput.value || !passInput.value) return;

                try {
                    if (errorDiv) errorDiv.textContent = '';
                    if (submitBtn) submitBtn.disabled = true;
                    submitBtn.textContent = 'Đang xử lý...';

                    const formData = new FormData();
                    formData.append('action', 'reset_password');
                    formData.append('email', resetForm.dataset.email);
                    formData.append('otp', otpInput.value.trim());
                    formData.append('new_password', passInput.value);

                    const response = await fetch('../../backend/auth/forgot-password.php', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();

                    if (data.success) {
                        alert(data.message);
                        resetContainer.style.display = 'none';
                        signInContainer.style.display = 'flex';
                    } else {
                        if (errorDiv) errorDiv.textContent = data.message;
                    }
                } catch (error) {
                    if (errorDiv) errorDiv.textContent = 'Lỗi kết nối: ' + error.message;
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Đổi Mật Khẩu';
                    }
                }
            });
        }
    },

    show() {
        if (!this.overlay) {
            this.init();
        }
        if (this.overlay) {
            this.overlay.style.display = 'flex';
            this.overlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    },

    close() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
            this.overlay.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof BlackWhiteAuth !== 'undefined' && BlackWhiteAuth.init) {
        BlackWhiteAuth.init();
    }
});

window.BlackWhiteAuth = BlackWhiteAuth;
