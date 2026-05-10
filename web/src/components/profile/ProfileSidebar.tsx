import { LogOut } from 'lucide-react';
import type { ElementType } from 'react';

interface TabConfig {
  id: string;
  label: string;
  icon: ElementType;
}

interface ProfileSidebarProps {
  tabs: TabConfig[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function ProfileSidebar({ tabs, activeTab, setActiveTab, onLogout }: ProfileSidebarProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/90 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 lg:sticky lg:top-20 lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto">
      <nav className="space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 font-medium text-left transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-black text-white shadow-md dark:bg-white dark:text-slate-950'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-black dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
        <hr className="my-2 border-gray-200 dark:border-slate-700" />
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-medium text-left text-red-600 transition-all duration-300 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>Đăng xuất</span>
        </button>
      </nav>
    </div>
  );
}
