'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItemData, Producto } from '@yasydani/shared';

interface CartState {
  items: CartItemData[];
  isOpen: boolean;
  addItem: (item: CartItemData) => void;
  removeItem: (productoId: string) => void;
  updateQuantity: (productoId: string, cantidad: number) => void;
  clearCart: () => void;
  toggleCart: (value?: boolean) => void;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (newItem) =>
        set((state) => {
          const idx = state.items.findIndex(
            (i) => i.producto.id === newItem.producto.id
          );
          if (idx >= 0) {
            const updated = [...state.items];
            updated[idx] = {
              ...updated[idx],
              cantidad: updated[idx].cantidad + newItem.cantidad,
            };
            return { items: updated };
          }
          return { items: [...state.items, newItem] };
        }),

      removeItem: (productoId) =>
        set((state) => ({
          items: state.items.filter((i) => i.producto.id !== productoId),
        })),

      updateQuantity: (productoId, cantidad) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.producto.id === productoId ? { ...i, cantidad } : i
          ),
        })),

      clearCart: () => set({ items: [] }),

      toggleCart: (value) =>
        set((state) => ({
          isOpen: value !== undefined ? value : !state.isOpen,
        })),

      total: () =>
        get().items.reduce(
          (sum, i) => sum + (i.producto.precio ?? 0) * i.cantidad,
          0
        ),

      count: () =>
        get().items.reduce((sum, i) => sum + i.cantidad, 0),
    }),
    {
      name: 'yasydani-cart',
      // No persistir el estado de apertura del panel
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// Helpers tipados
export type { CartItemData };
export type { Producto };
