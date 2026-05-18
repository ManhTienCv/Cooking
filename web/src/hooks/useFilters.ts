import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const normalizeString = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

interface UseFiltersOptions {
  categories?: string[];
  initialCategory?: string;
  pageSize: number;
}

export function useFilters({
  categories = [],
  initialCategory = 'Tất cả',
}: UseFiltersOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const qParam = searchParams.get('q');
  
  const [searchQuery, setSearchQuery] = useState(qParam || '');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [currentPage, setCurrentPage] = useState(1);

  // Sync category from URL
  useEffect(() => {
    if (!categoryParam) {
      setSelectedCategory(initialCategory);
      return;
    }

    if (categories.length === 0) {
      setSelectedCategory(categoryParam);
      return;
    }

    const normalizedParam = normalizeString(categoryParam);
    const normalizedInitial = normalizeString(initialCategory);

    if (normalizedParam === normalizedInitial) {
      setSelectedCategory(initialCategory);
      return;
    }

    const match = categories.find((cat) => normalizeString(cat) === normalizedParam);
    if (match) {
      setSelectedCategory(match);
    } else {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam, categories, initialCategory]);

  const handleCategoryChange = useCallback((value: string) => {
    const isAll = value === initialCategory;
    setSelectedCategory(value);
    
    const next = new URLSearchParams(searchParams);
    if (value && !isAll) {
      next.set('category', value);
    } else {
      next.delete('category');
    }
    setSearchParams(next, { replace: true });
    setCurrentPage(1);
  }, [searchParams, setSearchParams, initialCategory]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    handleCategoryChange(initialCategory);
    setSearchParams({});
  }, [handleCategoryChange, initialCategory, setSearchParams]);

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
