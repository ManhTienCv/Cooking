import { useEffect, useState } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const handleThemeChange = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    };

    // Mặc định luôn là giao diện Sáng (Light Mode), chỉ bật Dark khi người dùng chủ động lưu 'dark' trong localStorage
    const savedTheme = localStorage.getItem('theme') || localStorage.theme;
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }

    // Listen to changes (if toggled from another component)
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      localStorage.theme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      localStorage.theme = 'dark';
    }
  };

  return { isDark, toggleTheme };
}
