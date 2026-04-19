/**
 * Tên file: main.js
 * Công dụng: Script khởi chạy chính của ứng dụng.
 * Chức năng: 
 * - Khởi tạo các sự kiện toàn cục (Global Events).
 * - Binding sự kiện cho các thành phần UI chung.
 */
// Minimal JavaScript for UI interactions only
// Forms are handled by PHP

// Simple modal toggle for auth
function toggleAuthModal(show = true) {
  const modal = document.getElementById('authModal');
  if (modal) {
    if (show) {
      modal.classList.remove('hidden');
    } else {
      modal.classList.add('hidden');
    }
  }
}

// Modal functions for create plan (health page)
function openCreatePlanModal() {
  // Check if user is logged in
  const isLoggedIn = document.body.getAttribute('data-logged-in') === 'true';

  if (!isLoggedIn) {
    // Show auth modal instead
    toggleAuthModal(true);
    return;
  }

  const modal = document.getElementById('createPlanModal');
  if (modal) {
    modal.classList.remove('hidden');
    // Reinitialize icons after modal opens
    setTimeout(() => {
      if (window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons();
      }
    }, 100);
  }
}

function closeCreatePlanModal() {
  const modal = document.getElementById('createPlanModal');
  if (modal) {
    modal.classList.add('hidden');
    // Reset form
    const form = modal.querySelector('form');
    if (form) form.reset();
  }
}

// Image preview for file inputs
function setupImagePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (input && preview) {
    input.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          preview.classList.remove('hidden');
          const img = preview.querySelector('img');
          if (img) img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
  // Setup image previews
  setupImagePreview('recipeImageInput', 'recipeImagePreview');
  setupImagePreview('postImageInput', 'postImagePreview');
  setupImagePreview('avatarFileInput', 'avatarPreview');

  // Close modal on outside click
  const authModal = document.getElementById('authModal');
  if (authModal) {
    authModal.addEventListener('click', function (e) {
      if (e.target === authModal) {
        toggleAuthModal(false);
      }
    });
  }

  // Close create plan modal on outside click (health page)
  const createPlanModal = document.getElementById('createPlanModal');
  if (createPlanModal) {
    createPlanModal.addEventListener('click', function (e) {
      if (e.target === createPlanModal) {
        closeCreatePlanModal();
      }
    });
  }

  // Initialize Lucide icons if available
  if (window.lucide && window.lucide.createIcons) {
    window.lucide.createIcons();
  }
});

// Make functions globally available
window.toggleAuthModal = toggleAuthModal;
window.openCreatePlanModal = openCreatePlanModal;
window.closeCreatePlanModal = closeCreatePlanModal;
