import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CircleAlert, ShoppingCart, Truck, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';
import { formatPrice, stockBadgeClass } from '../lib/format';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, categories } = useStore();
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState(null);

  const product = products.find((p) => String(p.id) === id);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-800">Producto no encontrado</h2>
        <p className="text-sm text-slate-500 mt-2">El artículo solicitado no existe o fue retirado del catálogo.</p>
        <Link to="/catalogo" className="mt-6 inline-flex items-center gap-2 bg-sky-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver al catálogo
        </Link>
      </div>
    );
  }

  const category = categories.find((c) => c.id === product.category_id);
  const soldOut = product.stock <= 0;
  const dotClass = product.stock > 10 ? 'bg-emerald-500' : product.stock > 0 ? 'bg-amber-500' : 'bg-rose-500';

  const add = () => {
    const res = addToCart(product, qty);
    setMessage(
      res.success
        ? { type: 'success', text: `Se agregaron ${qty} unidad(es) de "${product.name}" al carrito.` }
        : { type: 'error', text: res.message }
    );
    setTimeout(() => setMessage(null), 3500);
    return res.success;
  };

  const buyNow = () => {
    if (add()) navigate('/carrito');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <CircleAlert className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 p-6 sm:p-10">
        <div className="space-y-4">
          <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative">
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            {category && (
              <div className="absolute top-4 left-4">
                <span className="text-xs font-bold bg-white/90 backdrop-blur-md text-slate-800 px-3 py-1 rounded-lg shadow-sm">
                  {category.name}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">{product.name}</h1>
            <div className="flex items-center gap-4">
              <span className="text-3xl font-black text-slate-900">{formatPrice(product.price)}</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${stockBadgeClass(product.stock)}`}>
                <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                {product.stock > 0 ? `${product.stock} unidades en bodega` : 'Sin existencias'}
              </span>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descripción del Producto</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-100">
            {soldOut ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
                Actualmente no hay existencias disponibles de este producto. El sistema no permite pedidos sobre productos agotados.
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700">Cantidad deseada</label>
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent font-bold transition"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-bold text-sm text-slate-900">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                      disabled={qty >= product.stock}
                      className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent font-bold transition"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-slate-500">Máximo disponible: {product.stock}</span>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={add}
                    className="flex-1 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-sky-600/20 transition"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>Agregar al Carrito</span>
                  </button>
                  <button onClick={buyNow} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition">
                    Comprar Ahora
                  </button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-600" />
                <span>Despacho con Guía de Trazabilidad</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Garantía Comunitaria Syntratech</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
