import { Link } from 'react-router-dom';
import { ShieldCheck, Leaf, Truck, ShoppingCart, ArrowRight, Droplet, CircleCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';
import { formatPrice, stockBadgeClass } from '../lib/format';

const PILLARS = [
  { icon: ShieldCheck, color: 'text-sky-400', label: 'Calidad garantizada' },
  { icon: Leaf, color: 'text-emerald-400', label: 'Productos seguros' },
  { icon: Truck, color: 'text-teal-400', label: 'Envíos rápidos' },
  { icon: ShoppingCart, color: 'text-amber-400', label: 'Compra fácil y segura' },
];

const COMMITMENTS = [
  {
    color: 'text-emerald-600',
    title: 'Fórmulas Certificadas',
    text: 'Productos biodegradables respetuosos con tu familia, mascotas y el medio ambiente.',
  },
  {
    color: 'text-sky-600',
    title: 'Despacho con Guía Rastreable',
    text: 'Estados con hora exacta: Pendiente, En preparación, Despachado y Entregado.',
  },
  {
    color: 'text-indigo-600',
    title: 'Seguridad en tu Compra',
    text: 'Paga de forma fácil y segura, con opción contra entrega o pago electrónico.',
  },
];

export default function HomePage() {
  const { products, categories } = useStore();
  const { addToCart } = useCart();
  const featured = products.filter((p) => p.is_active).slice(0, 4);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 rounded-b-3xl shadow-xl">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              <span>Limpieza que te acompaña</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
              Productos de limpieza para un hogar más <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400">
                limpio, seguro y saludable
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Fórmulas biodegradables de alta efectividad para ropa, cocina, pisos y baños con
              inventario verificado en tiempo real y despacho directo a tu puerta.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/catalogo"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5"
              >
                <span>Ver Catálogo de Limpieza</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/pedidos"
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-6 py-3.5 rounded-xl border border-slate-700 transition"
              >
                <span>Rastrear mi Despacho</span>
                <Truck className="w-4 h-4 text-sky-400" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-800">
              {PILLARS.map(({ icon: Icon, color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 shrink-0 ${color}`} />
                  <span className="text-xs font-bold text-slate-200">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-white group">
              <img
                src="/syntratech-hero.jpg"
                alt="Syntratech - Limpieza que te acompaña"
                className="w-full h-auto object-cover group-hover:scale-[1.02] transition duration-500"
              />
              <div className="absolute bottom-3 left-3 right-3 bg-slate-900/85 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-white block">Syntratech Hogar</span>
                  <span className="text-[11px] text-emerald-300">Inventario y existencias en tiempo real</span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                  100% ACTIVO
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Líneas de Limpieza y Cuidado</h2>
            <p className="text-sm text-slate-500 mt-1">Explora nuestras soluciones certificadas para cada rincón</p>
          </div>
          <Link to="/catalogo" className="text-sm font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1">
            Ver todas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {categories.map((cat) => {
            const count = products.filter((p) => p.category_id === cat.id).length;
            return (
              <Link
                key={cat.id}
                to={`/catalogo?categoria=${cat.slug}`}
                className="group p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-lg transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition">
                    <Droplet className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-3 group-hover:text-emerald-700 transition leading-snug">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{cat.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{count} ref.</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-500 transform group-hover:translate-x-1 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Destacados */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Productos Más Solicitados</h2>
            <p className="text-sm text-slate-500 mt-1">Existencias listas para despacho inmediato</p>
          </div>
          <Link to="/catalogo" className="text-sm font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1">
            Ver catálogo completo <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition">
              <Link to={`/producto/${p.id}`} className="block relative aspect-square bg-slate-100 overflow-hidden">
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                <span className={`absolute top-3 right-3 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm ${stockBadgeClass(p.stock)}`}>
                  {p.stock > 0 ? `${p.stock} disponibles` : 'Agotado'}
                </span>
              </Link>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <Link to={`/producto/${p.id}`} className="font-bold text-slate-900 hover:text-emerald-600 transition line-clamp-1">
                    {p.name}
                  </Link>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">Precio</span>
                    <span className="text-lg font-black text-slate-900">{formatPrice(p.price)}</span>
                  </div>
                  <button
                    disabled={p.stock <= 0}
                    onClick={() => addToCart(p, 1)}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                  >
                    {p.stock > 0 ? 'Agregar' : 'Agotado'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Compromiso */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-100 rounded-3xl p-8 sm:p-12 border border-slate-200">
          <div className="max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Compromiso de Calidad y Trazabilidad Syntratech</h2>
            <p className="text-slate-600 mt-3 text-sm sm:text-base leading-relaxed">
              Cada pedido pasa por un riguroso control de calidad antes de salir de bodega. Mantenemos
              inventario exacto y un número de guía para que sepas en todo momento el avance de tu entrega.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {COMMITMENTS.map((c) => (
              <div key={c.title} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <CircleCheck className={`w-6 h-6 ${c.color}`} />
                <h3 className="font-bold text-slate-900 text-base">{c.title}</h3>
                <p className="text-xs text-slate-500">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
