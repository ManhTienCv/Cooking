import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const normalizeCategory = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export function useRecipeFilters(categories: string[]) {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [currentPage, setCurrentPage] = useState(1);

  // Sync category from URL
  useEffect(() => {
    if (!categoryParam) {
      setSelectedCategory('Tất cả');
      return;
    }
    const normalizedParam = normalizeCategory(categoryParam);
    if (!normalizedParam) return;

    const normalizedAll = normalizeCategory('Tất cả');
    if (normalizedParam === normalizedAll) {
      setSelectedCategory('Tất cả');
      return;
    }

    const match = categories.find((cat) => normalizeCategory(cat) === normalizedParam);
    if (match) {
      setSelectedCategory(match);
    }
  }, [categoryParam, categories]);

  const handleCategoryChange = useCallback((value: string) => {
    const isAll = value === 'Tất cả';
    setSelectedCategory(value);
    
    const next = new URLSearchParams(searchParams);
    if (value && !isAll) {
      next.set('category', value);
    } else {
      next.delete('category');
    }
    setSearchParams(next, { replace: true });
    setCurrentPage(1); // Reset page on category change
  }, [searchParams, setSearchParams]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset page on search
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    handleCategoryChange('Tất cả');
  }, [handleCategoryChange]);

  return {
    searchQuery,
    setSearchQuery: handleSearchChange,
    selectedCategory,
    setSelectedCategory: handleCategoryChange,
    currentPage,
    setCurrentPage: handlePageChange,
    clearFilters
  };
}
