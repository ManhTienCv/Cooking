interface HealthTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function HealthTabs({ activeTab, setActiveTab }: HealthTabsProps) {
  return (
    <div className="border-b border-gray-200 dark:border-slate-700">
      <nav className="flex flex-wrap">
        <button 
          onClick={() => setActiveTab('plans')}
          className={`px-6 py-4 text-sm font-medium ${activeTab === 'plans' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
        >
          Kế hoạch của tôi
        </button>
        <button 
          onClick={() => setActiveTab('shopping')}
          className={`px-6 py-4 text-sm font-medium ${activeTab === 'shopping' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
        >
          Danh sách mua sắm
        </button>
        <button 
          onClick={() => setActiveTab('nutrition')}
          className={`px-6 py-4 text-sm font-medium ${activeTab === 'nutrition' ? 'text-black dark:text-white border-b-2 border-black dark:border-white' : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
        >
          Dinh dưỡng
        </button>
      </nav>
    </div>
  );
}
