import HomeEditorialHeader from '../components/home/HomeEditorialHeader';
import FeaturedRecipes from '../components/home/FeaturedRecipes';
import HomeCategories from '../components/home/HomeCategories';
import HomeCallToAction from '../components/home/HomeCallToAction';

declare global {
  interface Window {
    VanillaTilt?: { init: (elements: Element[]) => void };
  }
}

export default function Home() {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 min-h-screen transition-colors duration-300">
      <HomeEditorialHeader />
      <FeaturedRecipes />
      <HomeCategories />
      <HomeCallToAction />
    </div>
  );
}
