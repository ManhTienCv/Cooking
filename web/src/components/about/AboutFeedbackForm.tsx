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
    } catch (err: any) {
      if (err.status === 429) {
        setStatus({ type: 'error', message: 'Bạn đang gửi quá nhiều phản hồi. Vui lòng thử lại sau.' });
      } else {
        setStatus({ type: 'error', message: err.message || 'Đã có lỗi xảy ra khi gửi phản hồi.' });
      }
    }
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <Reveal y={20}>
          <h3 className="text-3xl font-bold text-black mb-4">Phản hồi</h3>
          <p className="text-gray-600 mb-6">Hãy cho chúng tôi biết trải nghiệm của bạn.</p>

          {status.message && (
            <div
              className={`border rounded-xl p-4 mb-4 transition-all duration-500 ${
                status.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <p>{status.message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Tên của bạn"
              value={feedback.name}
              onChange={(e) => setFeedback({ ...feedback, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all font-medium"
            />
            <input
              type="email"
              placeholder="Email (tùy chọn)"
              value={feedback.email}
              onChange={(e) => setFeedback({ ...feedback, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all font-medium"
            />
            <textarea
              rows={4}
              placeholder="Nội dung phản hồi"
              value={feedback.message}
              onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all font-medium"
            />
            <button type="submit" className="px-6 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-900">
              Gửi phản hồi
            </button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
