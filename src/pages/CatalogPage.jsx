import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ArrowUpDown, Package, ShoppingCart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';
import { formatPrice, stockBadgeClass } from '../lib/format';
import Toast from '../components/Toast';

const PAGE_SIZE = 24;

export default function CatalogPage() {
  const { products, categories } = useStore();
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState('name-asc');
  const [toast, setToast] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const activeCategory = searchParams.get('categoria') || 'all';

  // Al cambiar los filtros se vuelve a la primera "página".
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, search, onlyInStock, sortBy]);

  const selectCategory = (slug) => {
    if (slug === 'all') setSearchParams({});
    else setSearchParams({ categoria: slug });
  };

  const handleAdd = (product) => {
    const res = addToCart(product, 1);
    setToast(
      res.success
        ? { type: 'success', text: `¡"${product.name}" agregado al carrito!` }
        : { type: 'error', text: res.message }
    );
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() => {
    const cat = categories.find((c) => c.slug === activeCategory);
    const term = search.trim().toLowerCase();
    return products
      .filter((p) => {
        if (!p.is_active) return false;
        if (activeCategory !== 'all' && cat && p.category_id !== cat.id) return false;
        if (term) {
          const inName = p.name.toLowerCase().includes(term);
          const inDesc = (p.description || '').toLowerCase().includes(term);
          if (!inName && !inDesc) return false;
        }
        return !(onlyInStock && p.stock <= 0);
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'stock-desc') return b.stock - a.stock;
        return a.name.localeCompare(b.name);
      });
  }, [products, categories, activeCategory, search, onlyInStock, sortBy]);

  const chipClass = (active) =>
    `px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
      active ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Toast toast={toast} />

      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Catálogo de Productos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Inventario verificado y disponibilidad en tiempo real para la comunidad.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-6 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
            />
          </div>
          <div className="md:col-span-3 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="name-asc">Nombre (A - Z)</option>
              <option value="price-asc">Precio (Menor a Mayor)</option>
              <option value="price-desc">Precio (Mayor a Menor)</option>
              <option value="stock-desc">Mayor Existencia</option>
            </select>
          </div>
          <div className="md:col-span-3 flex items-center justify-end">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
              />
              <span>Solo en existencia</span>
            </label>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-slate-100 scrollbar-none">
          <button onClick={() => selectCategory('all')} className={chipClass(activeCategory === 'all')}>
            Todas las categorías
          </button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => selectCategory(c.slug)} className={chipClass(activeCategory === c.slug)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">No se encontraron productos</h3>
          <p className="text-sm text-slate-500 mt-1">Intenta cambiar tus términos de búsqueda o filtros seleccionados.</p>
          <button
            onClick={() => {
              setSearch('');
              selectCategory('all');
              setOnlyInStock(false);
            }}
            className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition"
          >
            Restablecer Filtros
          </button>
        </div>
      ) : (
        <>
        <p className="text-xs text-slate-500">
          Mostrando {Math.min(visibleCount, filtered.length)} de {filtered.length} productos
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.slice(0, visibleCount).map((p) => {
            const cat = categories.find((c) => c.id === p.category_id);
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition group">
                <Link to={`/producto/${p.id}`} className="block relative aspect-square bg-slate-100 overflow-hidden">
                  <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  {cat && (
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-bold bg-white/90 backdrop-blur-md text-slate-700 px-2.5 py-1 rounded-md shadow-sm">
                        {cat.name}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm ${stockBadgeClass(p.stock)}`}>
                      {p.stock > 0 ? `${p.stock} disponibles` : 'Agotado'}
                    </span>
                  </div>
                </Link>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <Link to={`/producto/${p.id}`} className="font-bold text-slate-900 group-hover:text-sky-600 transition line-clamp-1">
                      {p.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{p.description}</p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Precio</span>
                      <span className="text-xl font-extrabold text-slate-900">{formatPrice(p.price)}</span>
                    </div>
                    <button
                      disabled={p.stock <= 0}
                      onClick={() => handleAdd(p)}
                      className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-sm transition"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{p.stock > 0 ? 'Agregar' : 'Agotado'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {visibleCount < filtered.length && (
          <div className="text-center pt-2">
            <button
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl shadow-sm transition"
            >
              Ver más productos ({filtered.length - visibleCount} restantes)
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}
