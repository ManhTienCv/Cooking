

interface BlogFilterBarProps {
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
}

export default function BlogFilterBar({
  categories,
  selectedCategory,
  setSelectedCategory,
}: BlogFilterBarProps) {
  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-white/20 dark:border-slate-800/20 sticky top-16 z-40 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                  selectedCategory === cat ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 shadow-sm'
                }`}
              >
                {cat}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
