import { Timer, ChefHat } from 'lucide-react';
import { Reveal, RevealStaggerItem } from '../motion/ScrollReveal';

interface RecipeInstructionsProps {
  instructions: string[];
  activeTimer: { step: number; seconds: number } | null;
  onStartTimer: (step: number, seconds: number) => void;
  formatTimer: (seconds: number) => string;
  extractMinutes: (step: string) => number | null;
}

export default function RecipeInstructions({
  instructions,
  activeTimer,
  onStartTimer,
  formatTimer,
  extractMinutes,
}: RecipeInstructionsProps) {
  return (
    <Reveal y={20}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
        <h2 className="text-2xl font-serif font-bold text-black dark:text-white mb-6 flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-amber-500" />
          Hướng dẫn nấu ăn
        </h2>
        <div className="space-y-5">
          {instructions.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">Chưa có hướng dẫn.</p>
          ) : (
            instructions.map((instruction, index) => {
              const mins = extractMinutes(instruction);
              const isTimerActive = activeTimer?.step === index;
              return (
                <RevealStaggerItem key={index} index={index} stagger={0.04} maxStaggerIndex={14}>
                  <div className={`flex gap-4 p-3 rounded-xl transition-colors ${isTimerActive ? 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-400/50' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
                    <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-md">
                      {index + 1}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{instruction}</p>
                      {mins && (
                        <div className="mt-2 flex items-center gap-2">
                          {isTimerActive ? (
                            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-mono text-sm font-bold bg-amber-100 dark:bg-amber-500/20 px-3 py-1 rounded-full animate-pulse">
                              <Timer className="h-3.5 w-3.5" />
                              {formatTimer(activeTimer!.seconds)}
                            </span>
                          ) : (
                            <button
                              onClick={() => onStartTimer(index, mins * 60)}
                              className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors font-medium"
                            >
                              <Timer className="h-3.5 w-3.5" />
                              Bấm giờ {mins} phút
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </RevealStaggerItem>
              );
            })
          )}
        </div>
      </div>
    </Reveal>
  );
}
