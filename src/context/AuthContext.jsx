import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, IS_CONNECTED } from '../lib/supabaseClient';
import { DEMO_PROFILES } from '../data/seedData';

const AuthContext = createContext();

export const ROLES = {
  admin: { label: 'Administrador', badge: 'bg-rose-100 text-rose-800 border-rose-300' },
  proveedor: { label: 'Proveedor', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  cliente: { label: 'Cliente', badge: 'bg-sky-100 text-sky-800 border-sky-300' },
};

// Al registrarse por su cuenta, toda persona queda como cliente.
// Los roles proveedor y admin los asigna el administrador desde el panel.
export const SELF_SIGNUP_ROLES = ['cliente'];

const DEMO_ROLE_KEY = 'syntratech_demo_role';

// Redes sociales que ofrece la pantalla de ingreso (id = nombre del proveedor en Supabase).
// Cada una se activa en Supabase → Authentication → Sign In / Providers (ver LEEME_PRIMERO.md).
export const SOCIAL_PROVIDERS = [
  { id: 'google', label: 'Google' },
  { id: 'azure', label: 'Microsoft', scopes: 'email' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'apple', label: 'Apple' },
  { id: 'github', label: 'GitHub' },
  { id: 'twitter', label: 'X (Twitter)' },
  { id: 'linkedin_oidc', label: 'LinkedIn' },
  { id: 'discord', label: 'Discord' },
];

export const RESET_PATH = '/restablecer-contrasena';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [enabledProviders, setEnabledProviders] = useState({});

  // Modo demostración (sin Supabase): la sesión vive en localStorage.
  const loadDemoSession = () => {
    let role = null;
    try {
      role = localStorage.getItem(DEMO_ROLE_KEY);
    } catch {
      role = null;
    }
    const p = role && DEMO_PROFILES[role];
    if (p) {
      setUser({ id: p.id, email: p.email });
      setProfile(p);
    } else {
      setUser(null);
      setProfile(null);
    }
  };

  const fetchProfile = async (authUser) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
    if (error) {
      console.error('No se pudo leer el perfil en Supabase:', error.message);
    }
    if (data) {
      setProfile(data);
      return;
    }
    // El perfil aún no existe (por ejemplo, el disparador de registro no corrió): perfil mínimo de cliente.
    setProfile({
      id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
      role: 'cliente',
    });
  };

  useEffect(() => {
    if (!IS_CONNECTED) {
      loadDemoSession();
      setLoading(false);
      return undefined;
    }

    let active = true;
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!active) return;
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user);
        }
      })
      .catch((err) => console.warn('No se pudo verificar la sesión de Supabase:', err))
      .finally(() => active && setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
      if (session?.user) {
        setUser(session.user);
        // Diferido para no bloquear el callback de Supabase.
        setTimeout(() => fetchProfile(session.user), 0);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    // Qué redes sociales están activadas en Supabase (endpoint público de configuración).
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => active && cfg?.external && setEnabledProviders(cfg.external))
      .catch(() => {});

    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Solo en modo demostración: entra directamente con un perfil de prueba.
  const loginAsDemo = (role) => {
    const p = DEMO_PROFILES[role];
    if (!p) return;
    try {
      localStorage.setItem(DEMO_ROLE_KEY, role);
    } catch {
      /* almacenamiento no disponible */
    }
    setUser({ id: p.id, email: p.email });
    setProfile(p);
  };

  const login = async (rawEmail, password) => {
    // Un espacio al copiar y pegar el correo hace que Supabase rechace el ingreso.
    const email = String(rawEmail || '').trim().toLowerCase();
    if (IS_CONNECTED) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.warn('Ingreso rechazado por Supabase:', error.code || '', error.message);
        throw new Error(translateAuthError(error.message, error.code));
      }
      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user);
      }
      return data;
    }
    const found = Object.values(DEMO_PROFILES).find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      throw new Error('Modo demostración: usa uno de los accesos rápidos o un correo de prueba.');
    }
    loginAsDemo(found.role);
    return { user: found };
  };

  const register = async (email, password, fullName, role = 'cliente') => {
    const safeRole = SELF_SIGNUP_ROLES.includes(role) ? role : 'cliente';
    if (IS_CONNECTED) {
      const { data, error } = await supabase.auth.signUp({
        email: String(email || '').trim().toLowerCase(),
        password,
        options: { data: { full_name: fullName, role: safeRole } },
      });
      if (error) throw new Error(translateAuthError(error.message));
      return { ...data, needsConfirmation: !data.session };
    }
    loginAsDemo(safeRole);
    return { user: DEMO_PROFILES[safeRole], needsConfirmation: false };
  };

  // Ingreso con red social: redirige al proveedor y vuelve a la web ya autenticado.
  const loginWithProvider = async (provider) => {
    if (!IS_CONNECTED) {
      throw new Error('El ingreso con redes sociales requiere Supabase (no funciona en modo demostración).');
    }
    const config = SOCIAL_PROVIDERS.find((p) => p.id === provider);
    if (!enabledProviders[provider]) {
      throw new Error(
        `El ingreso con ${config?.label || provider} todavía no está activado en esta tienda. ` +
          'Mientras tanto, entra con tu correo o con un enlace de acceso sin contraseña.'
      );
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
        ...(config?.scopes ? { scopes: config.scopes } : {}),
      },
    });
    if (error) throw new Error(translateAuthError(error.message));
  };

  // Ingreso sin contraseña: llega al correo un enlace que abre la sesión.
  // Si el correo no tiene cuenta, se crea una de cliente.
  const requestMagicLink = async (email) => {
    if (!IS_CONNECTED) {
      throw new Error('El enlace de acceso requiere Supabase (no funciona en modo demostración).');
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
    });
    if (error) throw new Error(translateAuthError(error.message));
  };

  // Envía el correo con el enlace para crear una nueva contraseña.
  const requestPasswordReset = async (email) => {
    if (!IS_CONNECTED) {
      throw new Error('La recuperación de contraseña requiere Supabase (no funciona en modo demostración).');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${RESET_PATH}`,
    });
    if (error) throw new Error(translateAuthError(error.message));
  };

  // Guarda la nueva contraseña (la persona llega aquí desde el enlace del correo).
  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(translateAuthError(error.message));
    setIsRecovery(false);
  };

  const logout = async () => {
    if (IS_CONNECTED) await supabase.auth.signOut();
    try {
      localStorage.removeItem(DEMO_ROLE_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
    setUser(null);
    setProfile(null);
  };

  const role = profile?.role || (user ? 'cliente' : null);

  const value = {
    user,
    profile,
    loading,
    role,
    isAdmin: role === 'admin',
    isSupplier: role === 'proveedor',
    isStaff: role === 'admin' || role === 'proveedor',
    isRecovery,
    enabledProviders,
    loginAsDemo,
    loginWithProvider,
    requestMagicLink,
    requestPasswordReset,
    updatePassword,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function translateAuthError(message = '', code = '') {
  const m = message.toLowerCase();
  if (code === 'invalid_credentials' || m.includes('invalid login credentials'))
    return 'Correo o contraseña incorrectos. Revisa mayúsculas y minúsculas en la contraseña, o usa "¿Olvidaste tu contraseña?".';
  if (code === 'email_not_confirmed' || m.includes('email not confirmed'))
    return 'Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada (y spam).';
  if (code === 'user_banned') return 'Esta cuenta está bloqueada. Contacta al administrador.';
  if (m.includes('already registered')) return 'Este correo ya tiene una cuenta. Inicia sesión.';
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('same as the old') || m.includes('different from the old')) return 'La nueva contraseña debe ser distinta a la anterior.';
  if (m.includes('provider is not enabled')) return 'Este método de ingreso aún no está activado en Supabase.';
  if (m.includes('auth session missing')) return 'El enlace expiró o ya se usó. Solicita uno nuevo.';
  if (m.includes('rate limit') || m.includes('security purposes'))
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled'))
    return 'El registro de cuentas nuevas está desactivado en esta tienda.';
  if (m.includes('unable to validate email') || m.includes('invalid email'))
    return 'Ese correo no es válido. Revísalo e inténtalo de nuevo.';
  return message || 'Error en la autenticación.';
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  return ctx;
}
