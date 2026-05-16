import React from 'react';
import { Flame, Drumstick, Wheat, Droplets } from 'lucide-react';
import { Reveal } from '../motion/ScrollReveal';

interface NutritionBoxProps {
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export default function NutritionBox({ nutrition }: NutritionBoxProps) {
  const items = [
    { icon: Flame, label: 'Calories', value: `${nutrition.calories}`, unit: 'kcal', color: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10' },
    { icon: Drumstick, label: 'Protein', value: `${nutrition.protein}`, unit: 'g', color: 'text-red-500 bg-red-50 dark:bg-red-500/10' },
    { icon: Wheat, label: 'Carbs', value: `${nutrition.carbs}`, unit: 'g', color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' },
    { icon: Droplets, label: 'Fat', value: `${nutrition.fat}`, unit: 'g', color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' },
  ];

  return (
    <Reveal y={18} delay={0.03}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
        <h3 className="text-lg font-bold text-black dark:text-white mb-4 flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Dinh dưỡng (ước tính)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {items.map(({ icon: Icon, label, value, unit, color }) => (
            <div key={label} className={`${color} rounded-xl p-3 text-center`}>
              <Icon className="h-5 w-5 mx-auto mb-1" />
              <p className="text-lg font-bold">{value}<span className="text-xs font-normal ml-0.5">{unit}</span></p>
              <p className="text-xs opacity-70">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
