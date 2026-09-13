import React, { useState } from 'react';
import { Reveal } from '../motion/ScrollReveal';
import { apiJson } from '../../lib/api';

export default function AboutFeedbackForm() {
  const [feedback, setFeedback] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.name || !feedback.message) {
      setStatus({ type: 'error', message: 'Vui lòng điền đầy đủ tên và nội dung phản hồi.' });
      return;
    }
    
    try {
      const res = await apiJson<{ success: boolean; message: string }>('/api/feedback', {
        method: 'POST',
        body: JSON.stringify(feedback),
      });

      if (res.success) {
        setStatus({ type: 'success', message: res.message || 'Cảm ơn bạn đã gửi phản hồi! Chúng tôi đã ghi nhận ý kiến của bạn.' });
        setFeedback({ name: '', email: '', message: '' });
        setTimeout(() => setStatus({ type: '', message: '' }), 5000);
      } else {
        setStatus({ type: 'error', message: res.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.' });
      }
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error.status === 429) {
        setStatus({ type: 'error', message: 'Bạn đang gửi quá nhiều phản hồi. Vui lòng thử lại sau.' });
      } else {
        setStatus({ type: 'error', message: error.message || 'Đã có lỗi xảy ra khi gửi phản hồi.' });
      }
    }
  };

  return (
    <section className="py-20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-t border-slate-100 dark:border-slate-800">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Reveal y={20}>
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-full border border-blue-200/60 dark:border-blue-800/50">
              Lắng nghe người dùng
            </span>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-3 tracking-tight">Đóng Góp Ý Kiến & Phản Hồi</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto">
              Ý kiến của bạn là động lực giúp CookingBoy & KitchenCook không ngừng hoàn thiện chất lượng công thức và trải nghiệm mua sắm.
            </p>
          </div>

          {status.message && (
            <div
              className={`border rounded-2xl p-4 mb-6 transition-all duration-300 text-sm font-medium ${
                status.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}
            >
              <p>{status.message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-slate-800/90 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Họ và tên *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={feedback.name}
                  onChange={(e) => setFeedback({ ...feedback, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white text-sm transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Địa chỉ Email</label>
                <input
                  type="email"
                  placeholder="name@example.com (tùy chọn)"
                  value={feedback.email}
                  onChange={(e) => setFeedback({ ...feedback, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white text-sm transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">Nội dung phản hồi *</label>
              <textarea
                rows={4}
                placeholder="Chia sẻ trải nghiệm nấu ăn, góp ý công thức hoặc yêu cầu hỗ trợ..."
                value={feedback.message}
                onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white text-sm transition-all"
              />
            </div>
            <div className="text-right pt-2">
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 active:scale-98 transition-all cursor-pointer"
              >
                Gửi phản hồi ngay
              </button>
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
