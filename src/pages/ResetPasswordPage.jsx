import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Lock, CircleAlert, CircleCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';

const inputClass =
  'w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500';

// La persona llega aquí desde el enlace del correo de recuperación.
// Supabase abre una sesión temporal con ese enlace, que permite fijar la nueva contraseña.
export default function ResetPasswordPage() {
  const { user, loading, updatePassword, role } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => navigate(role === 'admin' || role === 'proveedor' ? '/admin' : '/'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white shadow-lg mx-auto">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Crear nueva contraseña</h2>
          {user && <p className="text-xs text-slate-500">Cuenta: {user.email}</p>}
        </div>

        {!user ? (
          <div className="space-y-4 text-center">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              El enlace no es válido, expiró o ya se usó. Solicita uno nuevo desde la pantalla de ingreso.
            </div>
            <Link to="/login" className="inline-block bg-sky-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl">
              Ir a Ingresar
            </Link>
          </div>
        ) : done ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-sm">
            <CircleCheck className="w-5 h-5 shrink-0" />
            <span>Contraseña actualizada. Te estamos llevando a tu cuenta...</span>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
                <CircleAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nueva contraseña (mín. 8)</label>
              <PasswordInput required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} autoComplete="new-password" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Repite la contraseña</label>
              <PasswordInput required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} autoComplete="new-password" />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl shadow-md transition text-sm"
            >
              {busy ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
