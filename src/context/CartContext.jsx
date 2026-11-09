import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useStore } from './StoreContext';

const CartContext = createContext();

export function CartProvider({ children }) {
  const { products } = useStore();
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('syntratech_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('syntratech_cart', JSON.stringify(items));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [items]);

  const addToCart = (product, qty = 1) => {
    const existing = items.find((i) => i.id === product.id);
    const newQty = (existing ? existing.quantity : 0) + qty;
    if (newQty > product.stock) {
      return { success: false, message: `Stock insuficiente. Solo quedan ${product.stock} unidades disponibles.` };
    }
    setItems((prev) =>
      prev.some((i) => i.id === product.id)
        ? prev.map((i) => (i.id === product.id ? { ...i, quantity: newQty } : i))
        : [...prev, { ...product, quantity: qty }]
    );
    return { success: true, message: 'Producto agregado al carrito' };
  };

  const updateQuantity = (id, qty, maxStock) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    if (maxStock !== undefined && qty > maxStock) {
      return { success: false, message: `No puedes superar las ${maxStock} unidades disponibles.` };
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
    return { success: true };
  };

  const removeFromCart = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  // El carrito guarda solo qué y cuánto; precio, nombre e imagen salen siempre del catálogo
  // actual (así un cambio de precio en el panel se refleja también en carritos ya armados).
  const liveItems = useMemo(
    () =>
      items.map((i) => {
        const p = products.find((prod) => prod.id === i.id);
        return p ? { ...i, name: p.name, price: Number(p.price), image_url: p.image_url, stock: p.stock } : i;
      }),
    [items, products]
  );

  const totalItems = liveItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = liveItems.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items: liveItems, addToCart, updateQuantity, removeFromCart, clearCart, totalItems, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe ser usado dentro de CartProvider');
  return ctx;
}
