import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { apiJson } from '../../lib/api';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  defaultDates: { today: string; nextWeek: string };
}


export default function CreatePlanModal({ isOpen, onClose, onSuccess, defaultDates }: CreatePlanModalProps) {
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [calorieNotes, setCalorieNotes] = useState('');

  const [planForm, setPlanForm] = useState(() => ({
    name: '',
    description: '',
    startDate: defaultDates.today,
    endDate: defaultDates.nextWeek,
    dietType: '',
    targetCalories: '',
    age: '',
    heightCm: '',
    weightKg: '',
    gender: 'female',
    activityLevel: 'light',
    goal: 'maintain',
  }));

  if (!isOpen) return null;

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanError(null);

    if (!planForm.name.trim()) {
      setPlanError('Vui lòng nhập tên kế hoạch.');
      return;
    }
    if (!planForm.startDate || !planForm.endDate) {
      setPlanError('Vui lòng chọn ngày bắt đầu và kết thúc.');
      return;
    }
    if (planForm.endDate < planForm.startDate) {
      setPlanError('Ngày kết thúc phải sau ngày bắt đầu.');
      return;
    }
    if (!planForm.dietType) {
      setPlanError('Vui lòng chọn chế độ ăn.');
      return;
    }

    const days = Math.max(
      1,
      Math.ceil((new Date(planForm.endDate).getTime() - new Date(planForm.startDate).getTime()) / (24 * 60 * 60 * 1000)) + 1
    );

    setIsSubmittingPlan(true);
    const hasCalories = planForm.targetCalories && Number(planForm.targetCalories) >= 1000;
    if (hasCalories) {
      setCalorieNotes('AI đang tạo thực đơn phù hợp với mục tiêu calo... Vui lòng đợi vài giây nhé.');
    }
    try {
      await apiJson<{ success: boolean; id: number; aiMessage?: string }>('/api/health/plans', {
        method: 'POST',
        body: JSON.stringify({
          name: planForm.name.trim(),
          description: planForm.description.trim(),
          start_date: planForm.startDate,
          end_date: planForm.endDate,
          diet_type: planForm.dietType,
          target_calories: planForm.targetCalories ? Number(planForm.targetCalories) : 0,
          meal_count: days * 3,
        }),
      });

      setPlanForm({
        name: '',
        description: '',
        startDate: defaultDates.today,
        endDate: defaultDates.nextWeek,
        dietType: '',
        targetCalories: '',
        age: '',
        heightCm: '',
        weightKg: '',
        gender: 'female',
        activityLevel: 'light',
        goal: 'maintain',
      });
      setCalorieNotes('');
      await onSuccess();
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Không thể tạo kế hoạch.');
      setCalorieNotes('');
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col my-4 shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-black">Tạo kế hoạch mới</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form className="space-y-4" onSubmit={handleCreatePlan}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tên kế hoạch</label>
              <input type="text" value={planForm.name} onChange={(e) => setPlanForm((prev) => ({ ...prev, name: e.target.value }))} required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/20 transition-all" placeholder="Ví dụ: Kế hoạch tuần này" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
              <textarea value={planForm.description} onChange={(e) => setPlanForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/20 transition-all" rows={3} placeholder="Mô tả về kế hoạch của bạn"></textarea>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ngày bắt đầu</label>
                <input type="date" value={planForm.startDate} onChange={(e) => setPlanForm((prev) => ({ ...prev, startDate: e.target.value }))} required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/20 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ngày kết thúc</label>
                <input type="date" value={planForm.endDate} onChange={(e) => setPlanForm((prev) => ({ ...prev, endDate: e.target.value }))} required className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/20 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chế độ ăn</label>
              <select value={planForm.dietType} onChange={(e) => setPlanForm((prev) => ({ ...prev, dietType: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/20 transition-all" required>
                <option value="">-- Chọn chế độ ăn --</option>
                <option value="Cân bằng">Cân bằng</option>
                <option value="Giảm cân">Giảm cân</option>
                <option value="Tăng cân">Tăng cân</option>
                <option value="Chay">Chay</option>
                <option value="Keto">Keto</option>
                <option value="Low-carb">Low-carb</option>
                <option value="High-protein">High-protein</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mục tiêu Calo (kcal/ngày)</label>
              <input type="number" min={1000} max={6000} value={planForm.targetCalories} onChange={(e) => setPlanForm((prev) => ({ ...prev, targetCalories: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-black focus:ring-2 focus:ring-black/20 transition-all" placeholder="Ví dụ: 2000" />
              <p className="text-xs text-gray-500 mt-1">Nhập mục tiêu calo để AI tự động tạo thực đơn phù hợp. Tối thiểu 1000 kcal.</p>
            </div>

            {calorieNotes && <p className="text-sm text-blue-600 bg-blue-50 px-4 py-3 rounded-xl animate-pulse">{calorieNotes}</p>}
            {planError && <p className="text-sm text-red-600">{planError}</p>}
            <div className="pt-4">
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={onClose} disabled={isSubmittingPlan} className="px-6 py-3 border border-gray-300 rounded-full font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">Hủy</button>
                <button type="submit" disabled={isSubmittingPlan} className="bg-black text-white px-6 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">{isSubmittingPlan ? 'Đang tạo...' : 'Tạo kế hoạch'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
