import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set) => ({
      items: [],
      isCartOpen: false,

      openCart:  () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      addItem: (item) => set((state) => {
        const existing = state.items.find(
          (i) =>
            i.productId === item.productId &&
            i.size === item.size &&
            i.fabric === item.fabric &&
            i.extra10cm === item.extra10cm
        );
        if (existing) {
          return {
            items: state.items.map((i) =>
              i === existing ? { ...i, quantity: i.quantity + 1 } : i
            ),
          };
        }
        return {
          items: [
            ...state.items,
            { ...item, id: Date.now().toString(), quantity: 1 },
          ],
        };
      }),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'matrelax-cart',
      // Сохраняем только items — функции и вычисляемые значения не трогаем
      partialize: (state) => ({ items: state.items }),
    }
  )
);
