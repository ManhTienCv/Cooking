/**
 * Tên file: blog-interaction.js
 * Công dụng: Tương tác bài viết blog.
 * Chức năng: 
 * - Xử lý Like/Unlike bài viết.
 * - Xử lý Chia sẻ bài viết.
 * - Xử lý đóng mở form bình luận/sửa bình luận.
 */
document.addEventListener('DOMContentLoaded', function () {
    // Like Button
    const likeBtn = document.getElementById('likeBtn');
    if (likeBtn) {
        likeBtn.addEventListener('click', async function () {
            const postId = this.dataset.id;
            if (!postId) return;

            try {
                const response = await fetch('api/like_post.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ post_id: postId })
                });

                const data = await response.json();
                if (data.success) {
                    // Try to find SVG (Lucide replaced) or fall back to i
                    const icon = this.querySelector('svg') || this.querySelector('i');
                    const countSpan = this.querySelector('span');

                    countSpan.textContent = data.count + ' Thích';

                    if (icon) {
                        if (data.liked) {
                            icon.classList.add('fill-current', 'text-red-500');
                            this.classList.add('text-red-500');
                            this.classList.remove('text-gray-600');
                        } else {
                            icon.classList.remove('fill-current', 'text-red-500');
                            this.classList.remove('text-red-500');
                            this.classList.add('text-gray-600');
                        }
                    }
                } else if (data.error === 'auth_required') {
                    alert('Vui lòng đăng nhập để thích bài viết.');
                }
            } catch (error) {
                console.error('Error:', error);
            }
        });
    }

    // Share Button
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async function () {
            const url = window.location.href;
            const span = this.querySelector('span');
            const originalText = 'Chia sẻ';

            // Try Web Share API first
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: document.title,
                        url: url
                    });
                    return; // Success, no need to show "Copied"
                } catch (err) {

                }
            }

            // Fallback to Clipboard
            navigator.clipboard.writeText(url).then(() => {
                span.textContent = 'Đã sao chép liên kết!';
                setTimeout(() => {
                    span.textContent = originalText;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert('Không thể sao chép liên kết: ' + url);
            });
        });
    }
});

function showEditForm(commentId) {
    document.getElementById('comment-content-' + commentId).classList.add('hidden');
    document.getElementById('edit-form-' + commentId).classList.remove('hidden');
}

function cancelEdit(commentId) {
    document.getElementById('comment-content-' + commentId).classList.remove('hidden');
    document.getElementById('edit-form-' + commentId).classList.add('hidden');
}
