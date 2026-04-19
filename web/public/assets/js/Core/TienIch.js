/**
 * Tên file: TienIch.js
 * Công dụng: Các hàm tiện ích cốt lõi (Core Utilities).
 * Chức năng: 
 * - Định dạng tiền tệ (Format Currency).
 * - Hiển thị thông báo (Notification/Toast).
 * - Debounce function (chống spam click/input).
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  if (password.length < 6) {
    return { isValid: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' };
  }
  if (password.length > 128) {
    return { isValid: false, message: 'Mật khẩu không được quá 128 ký tự' };
  }
  return { isValid: true, message: 'Mật khẩu hợp lệ' };
}

function setButtonLoading(button, isLoading = true, originalText = '') {
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.innerHTML = `
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Đang xử lý...
    `;
    button.disabled = true;
  } else {
    button.textContent = originalText || button.dataset.originalText || 'Xác nhận';
    button.disabled = false;
  }
}

function showNotification(message, type = 'info', duration = 1000) {
  const existingNotification = document.querySelector('.notification-popup');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = `notification-popup fixed top-4 right-4 z-50 max-w-sm w-full transition-all duration-300 transform translate-x-full`;

  const typeStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white'
  };

  notification.innerHTML = `
    <div class="${typeStyles[type]} p-4 rounded-lg shadow-lg flex items-center justify-between">
      <div class="flex items-center">
        <div class="mr-3">
          ${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}
        </div>
        <p class="text-sm font-medium">${message}</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
        ×
      </button>
    </div>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.remove('translate-x-full');
  }, 100);

  setTimeout(() => {
    notification.classList.add('translate-x-full');
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

function setupFormValidation(formElement) {
  const inputs = formElement.querySelectorAll('input[required]');

  inputs.forEach(input => {
    const errorElement = document.createElement('div');
    errorElement.className = 'text-red-500 text-sm mt-1 transition-all duration-200 opacity-0 transform translate-y-1';
    input.parentNode.appendChild(errorElement);

    input.addEventListener('blur', () => validateInput(input, errorElement));
    input.addEventListener('input', debounce(() => validateInput(input, errorElement), 500));
  });
}

function validateInput(input, errorElement) {
  let isValid = true;
  let errorMessage = '';

  if (input.value.trim() === '') {
    isValid = false;
    errorMessage = 'Trường này không được để trống';
  } else if (input.type === 'email' && !isValidEmail(input.value)) {
    isValid = false;
    errorMessage = 'Email không hợp lệ';
  } else if (input.type === 'password') {
    const validation = validatePassword(input.value);
    if (!validation.isValid) {
      isValid = false;
      errorMessage = validation.message;
    }
  }

  if (isValid) {
    input.classList.remove('border-red-500');
    input.classList.add('border-green-500');
    errorElement.textContent = '';
    errorElement.classList.add('opacity-0', 'translate-y-1');
  } else {
    input.classList.remove('border-green-500');
    input.classList.add('border-red-500');
    errorElement.textContent = errorMessage;
    errorElement.classList.remove('opacity-0', 'translate-y-1');
  }

  return isValid;
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    setTimeout(() => {
      const modalContent = modal.querySelector('.modal-content');
      if (modalContent) {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
      }
    }, 10);

    const form = modal.querySelector('form');
    if (form) {
      setupFormValidation(form);
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.classList.remove('scale-100', 'opacity-100');
      modalContent.classList.add('scale-95', 'opacity-0');
    }

    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');

      const form = modal.querySelector('form');
      if (form) {
        form.reset();
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
          input.classList.remove('border-red-500', 'border-green-500');
        });
      }
    }, 200);
  }
}
