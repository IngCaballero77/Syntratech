import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, ArrowRight, Trash2, TriangleAlert, PackageX, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { formatPrice, shippingCost, FREE_SHIPPING_FROM } from '../lib/format';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, clearCart, subtotal } = useCart();
  const { products } = useStore();
  const navigate = useNavigate();

  const shipping = shippingCost(subtotal);
  const total = subtotal + shipping;

  const rows = items.map((item) => {
    const prod = products.find((p) => p.id === item.id);
    const availableStock = prod ? prod.stock : 0;
    return { ...item, availableStock, hasEnoughStock: availableStock >= item.quantity };
  });
  const stockProblem = rows.some((r) => !r.hasEnoughStock);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
          <ShoppingCart className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Tu carrito está vacío</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Aún no has agregado productos a tu orden de compra.</p>
        <Link to="/catalogo" className="mt-8 inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Ir al Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Carrito de Compras</h1>
          <p className="text-sm text-slate-500">Revisa tus artículos antes de confirmar el despacho.</p>
        </div>
        <button onClick={clearCart} className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1">
          <Trash2 className="w-4 h-4" /> Vaciar Carrito
        </button>
      </div>

      {stockProblem && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-amber-900 text-sm">
          <TriangleAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Advertencia de existencias:</span> Uno o más productos en tu carrito superan las
            existencias físicas disponibles. Ajusta la cantidad antes de proceder al pago.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
          {rows.map((r) => (
            <div key={r.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4">
              <img src={r.image_url} alt={r.name} className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200" />
              <div className="flex-1 w-full space-y-1">
                <Link to={`/producto/${r.id}`} className="font-bold text-slate-900 hover:text-sky-600 transition text-sm sm:text-base line-clamp-1">
                  {r.name}
                </Link>
                <div className="text-xs text-slate-500">
                  Precio unitario: <span className="font-semibold text-slate-700">{formatPrice(r.price)}</span>
                </div>
                {!r.hasEnoughStock && (
                  <div className="text-xs font-semibold text-rose-600 flex items-center gap-1 pt-1">
                    <PackageX className="w-3.5 h-3.5" />
                    <span>Solo quedan {r.availableStock} unidades en bodega</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <div className="inline-flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(r.id, r.quantity - 1, r.availableStock)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-700 hover:bg-white font-bold transition"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-sm text-slate-900">{r.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(r.id, r.quantity + 1, r.availableStock)}
                    disabled={r.quantity >= r.availableStock}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent font-bold transition"
                  >
                    +
                  </button>
                </div>
                <div className="text-right min-w-[80px]">
                  <span className="block text-xs text-slate-400">Subtotal</span>
                  <span className="text-base font-extrabold text-slate-900">{formatPrice(r.price * r.quantity)}</span>
                </div>
                <button onClick={() => removeFromCart(r.id)} className="p-2 text-slate-400 hover:text-rose-600 transition" title="Eliminar producto">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <Link to="/catalogo" className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700">
              <ArrowLeft className="w-3.5 h-3.5" /> Seguir comprando
            </Link>
            <span className="text-xs text-slate-500">
              {items.length} {items.length === 1 ? 'artículo diferente' : 'artículos diferentes'}
            </span>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">Resumen de la Orden</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal Productos</span>
              <span className="font-semibold text-slate-900">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <div>
                <span>Envío</span>
                <span className="block text-[11px] text-emerald-600 font-semibold">
                  {shipping === 0
                    ? '¡Tienes envío gratis!'
                    : `Gratis desde ${formatPrice(FREE_SHIPPING_FROM)} (te faltan ${formatPrice(FREE_SHIPPING_FROM - subtotal)})`}
                </span>
              </div>
              <span className="font-semibold text-slate-900">{shipping === 0 ? 'GRATIS' : formatPrice(shipping)}</span>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
              <span className="text-base font-bold text-slate-900">Total a Pagar</span>
              <span className="text-2xl font-black text-sky-600">{formatPrice(total)}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            disabled={stockProblem}
            className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-sky-600/20 transition"
          >
            <span>Continuar al Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="text-[11px] text-slate-500 flex items-center gap-2 justify-center pt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Compra protegida y confirmada en tiempo real</span>
          </div>
        </div>
      </div>
    </div>
  );
}
