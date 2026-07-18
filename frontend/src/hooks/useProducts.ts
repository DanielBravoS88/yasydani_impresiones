'use client';
import { useState, useEffect, useCallback } from 'react';
import { getProducts, getCategories } from '@/lib/api';
import type { Producto, Categoria } from '@yasydani/shared';

interface UseProductsOptions {
  categoria?: string;
  destacado?: boolean;
  q?: string;
}

export function useProducts(options: UseProductsOptions = {}) {
  const [products, setProducts] = useState<Producto[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProducts(options);
      setProducts(data);
    } catch {
      setError('No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.categoria, options.destacado, options.q]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  return { products, categories, loading, error, refetch: fetchProducts };
}
