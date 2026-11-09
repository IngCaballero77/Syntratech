import { useState } from 'react';
import { Tags, Pen, Trash2, Save, X, CirclePlus } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const fieldClass = 'w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 text-xs';

// Alta, edición y borrado de las líneas de producto (solo administrador).
export default function CategoriesPanel({ notify }) {
  const { categories, products, addCategory, updateCategory, deleteCategory } = useStore();
  const [form, setForm] = useState({ name: '', description: '' });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const countFor = (id) => products.filter((p) => p.category_id === id).length;

  const onCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addCategory(form);
      notify('success', `Categoría "${form.name}" creada.`);
      setForm({ name: '', description: '' });
    } catch (err) {
      notify('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    try {
      await updateCategory(editing.id, editing);
      notify('success', 'Categoría actualizada.');
      setEditing(null);
    } catch (err) {
      notify('error', err.message);
    }
  };

  const onDelete = async (c) => {
    const n = countFor(c.id);
    const extra = n > 0 ? `\n\nSus ${n} producto(s) quedarán como "General" (sin categoría).` : '';
    if (!window.confirm(`¿Eliminar la categoría "${c.name}"?${extra}`)) return;
    try {
      await deleteCategory(c.id);
      notify('success', 'Categoría eliminada.');
    } catch (err) {
      notify('error', err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <form onSubmit={onCreate} className="xl:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
        <div className="flex items-center gap-2">
          <Tags className="w-5 h-5 text-sky-600" />
          <h3 className="text-lg font-bold text-slate-900">Nueva categoría</h3>
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Nombre *</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} placeholder="Ej: Cuidado de pisos" />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Descripción</label>
          <textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={fieldClass} />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-xl shadow-sm transition"
        >
          <CirclePlus className="w-4 h-4" /> Crear categoría
        </button>
      </form>

      <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Productos</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((c) =>
                editing?.id === c.id ? (
                  <tr key={c.id} className="bg-slate-50">
                    <td className="px-4 py-3 space-y-2" colSpan={2}>
                      <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={fieldClass} aria-label="Nombre" />
                      <input
                        value={editing.description || ''}
                        onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                        className={fieldClass}
                        placeholder="Descripción"
                        aria-label="Descripción"
                      />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={onSave} className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700" title="Guardar">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditing(null)} className="p-1.5 text-slate-400 hover:text-slate-600" title="Cancelar">
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.description}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{countFor(c.id)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => setEditing({ ...c })} className="p-1.5 text-slate-400 hover:text-sky-600" title="Editar">
                        <Pen className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(c)} className="p-1.5 text-slate-400 hover:text-rose-600" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              )}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
                    No hay categorías.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
