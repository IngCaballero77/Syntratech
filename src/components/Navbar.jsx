import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  ShoppingCart,
  LogOut,
  User,
  X,
  Menu,
  SlidersHorizontal,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { user, profile, role, logout, isStaff, isSupplier } = useAuth();
  const { totalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const roleLabel = ROLES[role]?.label || role;
  const panelLabel = isSupplier ? 'Panel de Proveedor' : 'Panel de Gestión';

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Syntratech • Tienda Oficial de Limpieza &amp; Logística</span>
          </div>
          <div className="text-slate-300 font-medium text-center sm:text-right">
            Desarrollado por{' '}
            <span className="text-emerald-400 font-bold">Juan Camilo Caballero Sánchez</span>,{' '}
            <span className="text-emerald-400 font-bold">Andrés Vargas</span> y{' '}
            <span className="text-emerald-400 font-bold">Santiago Olaya Cuadros</span>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition">
              <img src="/logo.svg" alt="Syntratech Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 group-hover:text-sky-600 transition flex items-center gap-1">
                SYNTRATECH
              </span>
              <span className="hidden min-[400px]:block text-[10px] uppercase font-bold text-emerald-600 tracking-wider -mt-1 whitespace-nowrap">
                Limpieza que te acompaña
              </span>
            </div>
          </Link>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                isActive('/')
                  ? 'bg-sky-50 text-sky-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Inicio
            </Link>
            <Link
              to="/catalogo"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                isActive('/catalogo')
                  ? 'bg-sky-50 text-sky-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Catálogo
            </Link>
            {!isSupplier && (
              <Link
                to="/pedidos"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  isActive('/pedidos')
                    ? 'bg-sky-50 text-sky-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {role === 'admin' ? 'Pedidos' : 'Mis Pedidos'}
              </Link>
            )}
            {isStaff && (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  isActive('/admin')
                    ? 'bg-slate-900 text-white font-semibold shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-sky-500" />
                <span>{panelLabel}</span>
                <span className={`hidden xl:inline text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${ROLES[role]?.badge || ''}`}>
                  {roleLabel.toUpperCase()}
                </span>
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-3">
            <ThemeToggle />
            <Link
              to="/carrito"
              className="relative p-2.5 rounded-xl text-slate-700 hover:text-sky-600 hover:bg-sky-50 transition"
              title="Ver Carrito de Compras"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-sky-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white animate-scale">
                  {totalItems}
                </span>
              )}
            </Link>

            {user ? (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden lg:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </div>
                  <div className="text-[11px] text-slate-500">{roleLabel}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-xl shadow-sm transition"
                title="Ingresar"
                aria-label="Ingresar"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Ingresar</span>
              </Link>
            )}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-6 space-y-2">
          <Link to="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">
            Inicio
          </Link>
          <Link to="/catalogo" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">
            Catálogo de Productos
          </Link>
          {!isSupplier && (
            <Link to="/pedidos" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">
              Mis Pedidos y Seguimiento
            </Link>
          )}
          {isStaff && (
            <Link to="/admin" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium bg-slate-900 text-white">
              {panelLabel} ({roleLabel})
            </Link>
          )}
          <Link to="/carrito" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-100">
            Carrito ({totalItems} productos)
          </Link>
          {user ? (
            <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-rose-600 hover:bg-rose-50">
              Cerrar sesión ({roleLabel})
            </button>
          ) : (
            <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-sky-700 hover:bg-sky-50">
              Ingresar
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
