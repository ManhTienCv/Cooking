import React from 'react';
import { Reveal, RevealStaggerItem } from '../motion/ScrollReveal';

interface IngredientListProps {
  ingredients: string[];
  checkedIngredients: Set<number>;
  onToggleIngredient: (index: number) => void;
}

export default function IngredientList({
  ingredients,
  checkedIngredients,
  onToggleIngredient,
}: IngredientListProps) {
  return (
    <Reveal y={18} delay={0.05}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-black dark:text-white">Nguyên liệu</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">{checkedIngredients.size}/{ingredients.length}</span>
        </div>
        {ingredients.length > 0 && (
          <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(checkedIngredients.size / ingredients.length) * 100}%` }}
            />
          </div>
        )}
        <ul className="space-y-1.5">
          {ingredients.length === 0 ? (
            <li className="text-gray-500 dark:text-gray-400 text-sm">Chưa có danh sách.</li>
          ) : (
            ingredients.map((ingredient, index) => {
              const checked = checkedIngredients.has(index);
              return (
                <RevealStaggerItem key={index} index={index} stagger={0.03} maxStaggerIndex={16}>
                  <li
                    onClick={() => onToggleIngredient(index)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${checked ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-slate-600'}`}>
                      {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`text-sm transition-all duration-200 ${checked ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>{ingredient}</span>
                  </li>
                </RevealStaggerItem>
              );
            })
          )}
        </ul>
      </div>
    </Reveal>
  );
}
