// src/context/cart-context.jsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const CartContext = createContext(null);

function cartKey(storeId) {
  return `maxsten_cart_${storeId}`;
}

function loadCart(storeId) {
  try {
    const raw = localStorage.getItem(cartKey(storeId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Taro <CartProvider> di route/layout PARENT buyer (misal yang bungkus semua
// halaman /store/:storeId/*), BUKAN di tiap halaman satu-satu — biar cart-nya
// nyambung antara halaman katalog dan checkout, bukan reset tiap pindah page.
export function CartProvider({ storeId, children }) {
  const [items, setItems] = useState(() => loadCart(storeId));

  useEffect(() => {
    setItems(loadCart(storeId));
  }, [storeId]);

  useEffect(() => {
    localStorage.setItem(cartKey(storeId), JSON.stringify(items));
  }, [items, storeId]);

  const addItem = useCallback((item) => {
    setItems((prev) => [
      ...prev,
      {
        ...item,
        // Ganti C0FE04UUID() pakai trik string acak
        cartItemId: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      },
    ]);
  }, []);
  const removeItem = useCallback((cartItemId) => {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  }, []);

  const updateQuantity = useCallback((cartItemId, quantity) => {
    setItems((prev) =>
      prev.map((i) =>
        i.cartItemId === cartItemId
          ? { ...i, quantity: Math.max(1, quantity) }
          : i,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => {
    const unitPrice =
      i.price +
      (i.variant?.additional_price || 0) +
      (i.selected_addons?.reduce((s, a) => s + a.price, 0) || 0);
    return sum + unitPrice * i.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart harus dipakai di dalam <CartProvider>");
  return ctx;
}
