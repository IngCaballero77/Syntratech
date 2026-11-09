import { useMemo, useState } from 'react';
import { Search, UserPlus, Eye, EyeOff, RefreshCw, Pen, Trash2, X } from 'lucide-react';
import PasswordInput from './PasswordInput';
import { useStore } from '../context/StoreContext';
import { useAuth, ROLES } from '../context/AuthContext';
import { formatDate } from '../lib/format';

const fieldClass = 'w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 text-xs';

const emptyForm = { fullName: '', email: '', phone: '', city: '', address: '', role: 'admin', password: '' };

// Contraseña inicial aleatoria y legible (la persona puede cambiarla luego).
const randomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  return `Syn-${Array.from(bytes, (b) => chars[b % chars.length]).join('')}!`;
};

export default function UsersPanel({ notify }) {
  const { users, createUser, setUserRole, updateUser, deleteUser, setUserPassword } = useStore();
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const counts = useMemo(
    () => users.reduce((acc, u) => ({ ...acc, [u.role]: (acc[u.role] || 0) + 1 }), {}),
    [users]
  );

  const visible = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [u.full_name, u.email, u.city, u.phone].some((v) => (v || '').toLowerCase().includes(term));
  });

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      notify('error', 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSaving(true);
    try {
      await createUser(form);
      notify('success', `Cuenta de ${ROLES[form.role].label.toLowerCase()} creada para ${form.fullName}.`);
      setForm({ ...emptyForm, role: form.role });
      setShowPassword(false);
    } catch (err) {
      notify('error', err.message || 'No se pudo crear el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (u, role) => {
    if (role === u.role) return;
    if (!window.confirm(`¿Cambiar el rol de ${u.full_name || u.email} a ${ROLES[role].label}?`)) return;
    try {
      await setUserRole(u.id, role);
      notify('success', `${u.full_name || u.email} ahora es ${ROLES[role].label}.`);
    } catch (err) {
      notify('error', err.message);
    }
  };

  const openEdit = (u) =>
    setEditing({
      id: u.id,
      email: u.email,
      fullName: u.full_name || '',
      phone: u.phone || '',
      city: u.city || '',
      address: u.address || '',
      role: u.role,
      password: '',
    });

  const onEditChange = (e) => setEditing((f) => ({ ...f, [e.target.name]: e.target.value }));

  const saveEdit = async (e) => {
    e.preventDefault();
    if (editing.password && editing.password.length < 8) {
      notify('error', 'La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSavingEdit(true);
    try {
      await updateUser(editing.id, editing);
      if (editing.password) await setUserPassword(editing.id, editing.password);
      notify('success', `Datos de ${editing.fullName} actualizados${editing.password ? ' (incluida la contraseña)' : ''}.`);
      setEditing(null);
    } catch (err) {
      notify('error', err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const removeUser = async (u) => {
    const name = u.full_name || u.email;
    if (
      !window.confirm(
        `¿Eliminar la cuenta de ${name}?\n\nLa persona ya no podrá ingresar. Sus pedidos se conservan en el historial como "Usuario eliminado". Esta acción no se puede deshacer.`
      )
    )
      return;
    try {
      await deleteUser(u.id);
      notify('success', `Cuenta de ${name} eliminada.`);
    } catch (err) {
      notify('error', err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Formulario de alta */}
      <div className="xl:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-sky-600" />
          <h3 className="text-lg font-bold text-slate-900">Crear Usuario</h3>
        </div>
        <p className="text-xs text-slate-500">
          La cuenta queda activa de inmediato. Entrega a la persona su correo y contraseña inicial.
        </p>
        <form onSubmit={onSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Rol *</label>
            <select name="role" value={form.role} onChange={onChange} className={fieldClass}>
              <option value="admin">Administrador</option>
              <option value="proveedor">Proveedor</option>
              <option value="cliente">Cliente</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nombre completo *</label>
            <input name="fullName" required value={form.fullName} onChange={onChange} className={fieldClass} placeholder="Ej: María Fernanda Ruiz" />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Correo electrónico *</label>
            <input name="email" type="email" required value={form.email} onChange={onChange} className={fieldClass} placeholder="persona@empresa.com" autoComplete="off" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Teléfono</label>
              <input name="phone" type="tel" value={form.phone} onChange={onChange} className={fieldClass} placeholder="+57 300 000 0000" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ciudad</label>
              <input name="city" value={form.city} onChange={onChange} className={fieldClass} placeholder="Bogotá" />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Dirección</label>
            <input name="address" value={form.address} onChange={onChange} className={fieldClass} placeholder="Calle, número, oficina..." />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Contraseña inicial * (mín. 8)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={onChange}
                  className={`${fieldClass} pr-9`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, password: randomPassword() }));
                  setShowPassword(true);
                }}
                className="px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold flex items-center gap-1"
                title="Generar contraseña segura"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Generar
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-xl shadow-sm transition"
          >
            {saving ? 'Creando cuenta...' : `Crear ${ROLES[form.role].label}`}
          </button>
        </form>
      </div>

      {/* Lista de usuarios */}
      <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nombre, correo o ciudad..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {['all', 'admin', 'proveedor', 'cliente'].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                  roleFilter === r ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {r === 'all' ? `Todos (${users.length})` : `${ROLES[r].label} (${counts[r] || 0})`}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold sticky top-0">
              <tr>
                <th className="px-4 py-3">Persona</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Creado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{u.full_name || '—'}</div>
                    <div className="text-[11px] text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{u.phone || '—'}</div>
                    <div className="text-[11px] text-slate-400">{[u.city, u.address].filter(Boolean).join(' · ') || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    {u.id === user?.id ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLES[u.role]?.badge}`}>
                        {ROLES[u.role]?.label} (tú)
                      </span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        className="py-1 px-2 rounded-lg border border-slate-200 font-bold bg-white text-xs focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="admin">Administrador</option>
                        <option value="proveedor">Proveedor</option>
                        <option value="cliente">Cliente</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-400">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 text-slate-400 hover:text-sky-600 transition"
                      title="Editar datos"
                      aria-label={`Editar ${u.full_name || u.email}`}
                    >
                      <Pen className="w-4 h-4" />
                    </button>
                    {u.id !== user?.id && (
                      <button
                        onClick={() => removeUser(u)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                        title="Eliminar usuario"
                        aria-label={`Eliminar ${u.full_name || u.email}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No hay usuarios que coincidan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Editar usuario</h3>
                <p className="text-xs text-slate-500">{editing.email}</p>
              </div>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre completo *</label>
                <input name="fullName" required value={editing.fullName} onChange={onEditChange} className={fieldClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono</label>
                  <input name="phone" type="tel" value={editing.phone} onChange={onEditChange} className={fieldClass} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ciudad</label>
                  <input name="city" value={editing.city} onChange={onEditChange} className={fieldClass} />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección</label>
                <input name="address" value={editing.address} onChange={onEditChange} className={fieldClass} />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rol</label>
                <select name="role" value={editing.role} onChange={onEditChange} disabled={editing.id === user?.id} className={fieldClass}>
                  <option value="admin">Administrador</option>
                  <option value="proveedor">Proveedor</option>
                  <option value="cliente">Cliente</option>
                </select>
                {editing.id === user?.id && <p className="text-[11px] text-slate-400 mt-1">No puedes cambiar tu propio rol.</p>}
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nueva contraseña (opcional, mín. 8)</label>
                <PasswordInput
                  name="password"
                  minLength={8}
                  value={editing.password}
                  onChange={onEditChange}
                  className={`${fieldClass} pl-9`}
                  placeholder="Déjala vacía para no cambiarla"
                  autoComplete="new-password"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-sm"
                >
                  {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
