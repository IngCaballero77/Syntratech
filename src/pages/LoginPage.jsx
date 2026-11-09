import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Package,
  CircleAlert,
  CircleCheck,
  User,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Facebook,
  Twitter,
  Linkedin,
  Apple,
  Github,
  MessageCircle,
  Wand2,
} from 'lucide-react';
import { useAuth, SOCIAL_PROVIDERS } from '../context/AuthContext';
import { IS_CONNECTED } from '../lib/supabaseClient';
import { DEMO_PROFILES } from '../data/seedData';
import PasswordInput from '../components/PasswordInput';

const inputClass =
  'w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500';

const QUICK = [
  { role: 'admin', label: 'Administrador', cls: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' },
  { role: 'proveedor', label: 'Proveedor', cls: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' },
  { role: 'cliente', label: 'Cliente', cls: 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200' },
];

// Logo de Google (la librería de íconos no lo incluye).
const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

// Logo de Microsoft (cuatro cuadros), tampoco viene en la librería de íconos.
const MicrosoftLogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <rect x="1" y="1" width="10" height="10" fill="#F25022" />
    <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
    <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
    <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
  </svg>
);

const PROVIDER_ICON = {
  google: <GoogleLogo />,
  facebook: <Facebook className="w-4 h-4 text-[#1877F2]" />,
  twitter: <Twitter className="w-4 h-4 text-slate-900" />,
  linkedin_oidc: <Linkedin className="w-4 h-4 text-[#0A66C2]" />,
  apple: <Apple className="w-4 h-4 text-slate-900" />,
  github: <Github className="w-4 h-4 text-slate-900" />,
  discord: <MessageCircle className="w-4 h-4 text-[#5865F2]" />,
  azure: <MicrosoftLogo />,
};

const homeFor = (role) => (role === 'admin' || role === 'proveedor' ? '/admin' : '/');

export default function LoginPage() {
  const { login, register, loginAsDemo, loginWithProvider, requestPasswordReset, requestMagicLink, enabledProviders } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'magic'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const isMagic = mode === 'magic';
  const isEmailOnly = isForgot || isMagic;

  // Redes activadas primero; las que faltan por activar quedan al final, atenuadas.
  const providers = [...SOCIAL_PROVIDERS].sort(
    (a, b) => Number(!!enabledProviders[b.id]) - Number(!!enabledProviders[a.id])
  );
  const anyProviderEnabled = providers.some((p) => enabledProviders[p.id]);
  const from = location.state?.from;

  const switchMode = (next) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (isRegister) {
        const res = await register(email, password, fullName);
        if (res.needsConfirmation) {
          setMode('login');
          setInfo('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.');
          return;
        }
        navigate(from || '/');
      } else {
        await login(email, password);
        navigate(from || '/');
      }
    } catch (err) {
      setError(err.message || 'Error en la autenticación.');
    } finally {
      setBusy(false);
    }
  };

  const onEmailOnly = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (isMagic) {
        await requestMagicLink(email);
        setInfo(`Listo. Revisa ${email} (también en spam) y abre el enlace para entrar. Puedes cerrar esta pestaña.`);
        return;
      }
      await requestPasswordReset(email);
      setInfo(`Si ${email} tiene una cuenta, te enviamos un correo con el enlace para crear una nueva contraseña.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const socialLogin = async (provider) => {
    setError(null);
    setInfo(null);
    try {
      await loginWithProvider(provider);
    } catch (err) {
      setError(err.message);
    }
  };

  const quickAccess = (r) => {
    loginAsDemo(r);
    navigate(homeFor(r));
  };

  const title = isForgot
    ? 'Recuperar contraseña'
    : isMagic
      ? 'Entrar sin contraseña'
      : isRegister
        ? 'Crear Cuenta en Syntratech'
        : 'Acceso a la Plataforma';
  const subtitle = isForgot
    ? 'Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña'
    : isMagic
      ? 'Te enviamos un enlace a tu correo: lo abres y quedas dentro. Si no tienes cuenta, se crea al instante.'
      : 'Ingresa como cliente, proveedor o administrador';

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>

        {/* Accesos rápidos solo en modo demostración: en la tienda real no se muestran correos de cuentas. */}
        {!isEmailOnly && !IS_CONNECTED && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
              ⚡ Acceso rápido por rol (demostración)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {QUICK.map((q) => (
                <button
                  key={q.role}
                  type="button"
                  onClick={() => quickAccess(q.role)}
                  className={`py-1.5 px-2 border rounded-lg text-xs font-bold transition ${q.cls}`}
                >
                  {q.label}
                </button>
              ))}
            </div>
            {!IS_CONNECTED && (
              <p className="text-[11px] text-slate-400 text-center">
                Sin Supabase configurado: entra directo con {Object.keys(DEMO_PROFILES).length} perfiles de prueba.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
            <CircleAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
            <CircleCheck className="w-4 h-4 shrink-0" />
            <span>{info}</span>
          </div>
        )}

        {isEmailOnly ? (
          <form onSubmit={onEmailOnly} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-xl shadow-md transition text-sm"
            >
              {busy ? 'Enviando...' : isMagic ? 'Enviarme el enlace de acceso' : 'Enviar enlace de recuperación'}
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full flex items-center justify-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a Iniciar Sesión
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={onSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputClass}
                      placeholder="Ej: Laura Gómez"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="tu@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Contraseña</label>
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] font-semibold text-sky-600 hover:text-sky-700"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <PasswordInput
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
              </div>
              {isRegister && (
                <p className="text-[11px] text-slate-400">
                  Tu cuenta se crea como cliente. Si eres proveedor, pide al administrador que te asigne ese rol.
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-sky-600/20 transition text-sm"
              >
                {busy ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isRegister ? 'Registrarme' : 'Iniciar Sesión'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {IS_CONNECTED && (
              <button
                type="button"
                onClick={() => switchMode('magic')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition"
              >
                <Wand2 className="w-4 h-4" />
                Entrar sin contraseña (enlace a tu correo)
              </button>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[11px] text-slate-400 uppercase font-semibold">
                <span className="flex-1 h-px bg-slate-200" />o continúa con
                <span className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {providers.map((p) => {
                  const enabled = !!enabledProviders[p.id];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => socialLogin(p.id)}
                      title={enabled ? `Entrar con ${p.label}` : `${p.label}: todavía no está activado`}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                        enabled
                          ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          : 'border-dashed border-slate-200 bg-slate-50 text-slate-400 opacity-70'
                      }`}
                    >
                      {PROVIDER_ICON[p.id]}
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
              {IS_CONNECTED && !anyProviderEnabled && (
                <p className="text-[11px] text-slate-400 text-center">
                  Las redes sociales se están configurando. Por ahora entra con tu correo o con el enlace sin contraseña.
                </p>
              )}
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => switchMode(isRegister ? 'login' : 'register')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                {isRegister ? '¿Ya tienes una cuenta? Inicia sesión aquí' : '¿No tienes cuenta aún? Regístrate aquí'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
