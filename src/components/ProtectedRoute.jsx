import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth, ROLES } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-2xl border border-rose-200 shadow-sm text-center">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso No Autorizado</h2>
        <p className="text-sm text-slate-600 mb-6">
          Esta sección requiere el rol: <strong>{allowedRoles.map((r) => ROLES[r]?.label || r).join(' o ')}</strong>. Tu rol
          actual es: <span className="font-semibold text-rose-600">{ROLES[role]?.label || role}</span>.
        </p>
        <Link to="/" className="inline-block bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return children;
}
