import { Fragment, useState } from 'react';
import {
  CirclePlus,
  DollarSign,
  Package,
  Truck,
  TriangleAlert,
  History,
  Trash2,
  Save,
  X,
  Pen,
  Users,
  Tags,
  Wallet,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth, ROLES } from '../context/AuthContext';
import { formatPrice, formatDate, stockBadgeClass, PAYMENT_STATUS_LABELS } from '../lib/format';
import Toast from '../components/Toast';
import UsersPanel from '../components/UsersPanel';
import CategoriesPanel from '../components/CategoriesPanel';
import PaymentsPanel from '../components/PaymentsPanel';
import { paymentLabel, availableMethods } from '../lib/payments';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';
const fieldClass = 'w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 text-xs';

const LOG_BADGE = {
  ingreso: 'bg-emerald-100 text-emerald-800',
  venta: 'bg-sky-100 text-sky-800',
  egreso: 'bg-rose-100 text-rose-800',
};

const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

export default function AdminDashboard() {
  const {
    products,
    categories,
    orders,
    inventoryLogs,
    users,
    adjustStock,
    addProduct,
    updateProduct,
    deleteProduct,
    updateOrder,
    deleteOrder,
    loadError,
    paymentSettings,
  } = useStore();
  const onlyCashOnDelivery = availableMethods(paymentSettings).join() === 'contra_entrega';
  const { role, isAdmin } = useAuth();

  const emptyProduct = () => ({
    name: '',
    category_id: categories[0]?.id || '',
    price: '',
    stock: '',
    description: '',
    image_url: DEFAULT_IMAGE,
    is_active: true,
  });

  const [tab, setTab] = useState('inventory');
  const [toast, setToast] = useState(null);
  const [adjust, setAdjust] = useState({ open: false, product: null, delta: 5, type: 'ingreso', notes: '' });
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [editingTracking, setEditingTracking] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [openOrder, setOpenOrder] = useState(null);
  const [orderForm, setOrderForm] = useState(null);

  const notify = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const totalSales = orders.reduce((s, o) => s + (o.status !== 'cancelado' ? Number(o.total_amount) : 0), 0);
  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const lowStock = products.filter((p) => p.stock < 10);
  const activeOrders = orders.filter((o) => o.status === 'pendiente' || o.status === 'procesando');

  const submitAdjust = async (e) => {
    e.preventDefault();
    if (!adjust.product) return;
    try {
      const qty = Math.abs(Number(adjust.delta));
      const delta = adjust.type === 'egreso' ? -qty : qty;
      await adjustStock(adjust.product.id, delta, adjust.type, adjust.notes);
      notify('success', `Stock de "${adjust.product.name}" actualizado con éxito.`);
      setAdjust({ open: false, product: null, delta: 5, type: 'ingreso', notes: '' });
    } catch (err) {
      notify('error', err.message || 'Error al ajustar existencias.');
    }
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) {
      notify('error', 'El nombre y el precio son obligatorios.');
      return;
    }
    try {
      await addProduct({
        ...newProduct,
        slug: `${slugify(newProduct.name)}-${Date.now().toString(36).slice(-4)}`,
        category_id: newProduct.category_id || categories[0]?.id,
      });
      notify('success', `Producto "${newProduct.name}" creado con éxito.`);
      setNewProduct(emptyProduct());
      setTab('inventory');
    } catch (err) {
      notify('error', err.message || 'Error al crear producto.');
    }
  };

  const changeStatus = async (o, status) => {
    if (status === 'cancelado' && !window.confirm('¿Cancelar este pedido? Las unidades vuelven al inventario y no se puede reabrir.')) return;
    try {
      await updateOrder(o.id, { status });
      notify('success', `Pedido actualizado a "${status}".`);
    } catch (err) {
      notify('error', err.message || 'Error al cambiar estado del pedido.');
    }
  };

  const changePayment = async (o, payment_status) => {
    try {
      await updateOrder(o.id, { payment_status });
      notify('success', `Pago marcado como "${PAYMENT_STATUS_LABELS[payment_status]}".`);
    } catch (err) {
      notify('error', err.message || 'Error al cambiar el estado del pago.');
    }
  };

  const saveTracking = async (order, tracking) => {
    try {
      await updateOrder(order.id, { tracking_number: tracking.trim() || null });
      setEditingTracking(null);
      notify('success', 'Guía de rastreo actualizada.');
    } catch (err) {
      notify('error', err.message || 'Error al guardar guía.');
    }
  };

  const toggleOrder = (o) => {
    if (openOrder === o.id) {
      setOpenOrder(null);
      setOrderForm(null);
      return;
    }
    setOpenOrder(o.id);
    setOrderForm({
      shipping_address: o.shipping_address || '',
      shipping_city: o.shipping_city || '',
      shipping_phone: o.shipping_phone || '',
      notes: o.notes || '',
    });
  };

  const saveOrderDetails = async (o) => {
    if (!orderForm.shipping_address.trim() || !orderForm.shipping_city.trim() || !orderForm.shipping_phone.trim()) {
      notify('error', 'Dirección, ciudad y teléfono son obligatorios.');
      return;
    }
    try {
      await updateOrder(o.id, orderForm);
      notify('success', 'Datos de entrega actualizados.');
    } catch (err) {
      notify('error', err.message);
    }
  };

  const removeOrder = async (o) => {
    const warning =
      o.status === 'cancelado'
        ? '¿Eliminar este pedido cancelado del historial?'
        : '¿Eliminar este pedido? Primero se cancela (las unidades vuelven al inventario) y luego se borra del historial.';
    if (!window.confirm(`${warning}\n\nEsta acción no se puede deshacer.`)) return;
    try {
      await deleteOrder(o.id);
      setOpenOrder(null);
      notify('success', 'Pedido eliminado.');
    } catch (err) {
      notify('error', err.message);
    }
  };

  const removeProduct = async (p) => {
    if (!window.confirm(`¿Eliminar producto "${p.name}"?`)) return;
    try {
      const result = await deleteProduct(p.id);
      notify(
        'success',
        result === 'deactivated'
          ? 'El producto tiene ventas registradas, así que se pasó a Borrador (oculto en la tienda) en lugar de borrarse.'
          : 'Producto eliminado.'
      );
    } catch (err) {
      notify('error', err.message);
    }
  };

  const openProductEditor = (p) =>
    setEditingProduct({
      id: p.id,
      name: p.name,
      category_id: p.category_id || '',
      price: String(Math.round(Number(p.price) || 0)),
      description: p.description || '',
      image_url: p.image_url || '',
      is_active: p.is_active !== false,
      stock: p.stock,
    });

  const saveProduct = async (e) => {
    e.preventDefault();
    const price = Number(editingProduct.price);
    if (!editingProduct.name.trim() || !Number.isFinite(price) || price < 0) {
      notify('error', 'Revisa el nombre y el precio.');
      return;
    }
    try {
      const { id, name, category_id, description, image_url, is_active } = editingProduct;
      await updateProduct(id, { name: name.trim(), category_id, price, description, image_url: image_url || DEFAULT_IMAGE, is_active });
      notify('success', `Producto "${name}" actualizado.`);
      setEditingProduct(null);
    } catch (err) {
      notify('error', err.message);
    }
  };

  const tabs = [
    { key: 'inventory', icon: Package, label: `Control de Inventario (${products.length})` },
    ...(isAdmin ? [{ key: 'orders', icon: Truck, label: `Pedidos y Despachos (${orders.length})` }] : []),
    ...(isAdmin ? [{ key: 'users', icon: Users, label: `Usuarios (${users.length})` }] : []),
    ...(isAdmin ? [{ key: 'categories', icon: Tags, label: `Categorías (${categories.length})` }] : []),
    ...(isAdmin ? [{ key: 'payments', icon: Wallet, label: 'Pagos' }] : []),
    { key: 'logs', icon: History, label: `Trazabilidad y Auditoría (${inventoryLogs.length})` },
    { key: 'new-product', icon: CirclePlus, label: 'Nuevo Producto' },
  ];

  const stats = [
    ...(isAdmin
      ? [{ icon: DollarSign, color: 'bg-emerald-50 text-emerald-600', label: 'Ventas Totales', value: formatPrice(totalSales) }]
      : []),
    { icon: Package, color: 'bg-sky-50 text-sky-600', label: 'Stock en Bodega', value: `${totalStock} un.` },
    ...(isAdmin ? [{ icon: Truck, color: 'bg-amber-50 text-amber-600', label: 'Órdenes Activas', value: activeOrders.length }] : []),
    { icon: TriangleAlert, color: 'bg-rose-50 text-rose-600', label: 'Bajo Stock (<10)', value: lowStock.length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Toast toast={toast} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-slate-900">{isAdmin ? 'Panel de Control y Gestión' : 'Panel del Proveedor'}</h1>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase border ${ROLES[role]?.badge || ''}`}>
              {ROLES[role]?.label || role}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {isAdmin
              ? 'Gestión de inventarios, despacho logístico y trazabilidad comunitaria.'
              : 'Registra abastecimientos, revisa existencias y da de alta nuevos productos.'}
          </p>
        </div>
        <button
          onClick={() => setTab('new-product')}
          className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <CirclePlus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {loadError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
          No se pudieron cargar todos los datos de Supabase: {loadError}
        </div>
      )}

      {isAdmin && onlyCashOnDelivery && tab !== 'payments' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>
            <strong>Los clientes solo pueden pagar contra entrega.</strong> Escribe tu número de Nequi, tu cuenta
            Bancolombia o tu llave de Nu para que aparezcan como medios de pago en la tienda.
          </span>
          <button
            onClick={() => setTab('payments')}
            className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl"
          >
            Configurar medios de pago
          </button>
        </div>
      )}

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-6`}>
        {stats.map(({ icon: Icon, color, label, value }) => (
          <div key={label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold block uppercase">{label}</span>
              <span className="text-2xl font-black text-slate-900">{value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none pb-px">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
              tab === key ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800 text-sm">Existencias y Catálogo Activo</h3>
            <span className="text-xs text-slate-500 hidden sm:block">Haz clic en "Ajustar Stock" para registrar ingresos o egresos auditados</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Stock Actual</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const cat = categories.find((c) => c.id === p.category_id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0" />
                          <div>
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{p.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{cat?.name || 'General'}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{formatPrice(p.price)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full ${stockBadgeClass(p.stock)}`}>{p.stock} un.</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.is_active ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-600'}`}>
                          {p.is_active ? 'Publicado' : 'Borrador'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setAdjust({ open: true, product: p, delta: 5, type: 'ingreso', notes: '' })}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[11px] transition"
                        >
                          Ajustar Stock
                        </button>
                        <button onClick={() => openProductEditor(p)} className="p-1.5 text-slate-400 hover:text-sky-600 transition" title="Editar producto">
                          <Pen className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button onClick={() => removeProduct(p)} className="p-1.5 text-slate-400 hover:text-rose-600 transition" title="Eliminar producto">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm">Despachos y Guías de Trazabilidad</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">ID Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Destino</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Estado Logístico</th>
                  <th className="px-4 py-3">Pago</th>
                  <th className="px-4 py-3">Guía de Trazabilidad</th>
                  <th className="px-4 py-3 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      Aún no hay pedidos.
                    </td>
                  </tr>
                )}
                {orders.map((o) => (
                  <Fragment key={o.id}>
                  <tr className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900" title={o.id}>
                      <button onClick={() => toggleOrder(o)} className="inline-flex items-center gap-1 hover:text-sky-600" title="Ver y editar detalle">
                        {openOrder === o.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        {String(o.id).slice(0, 8).toUpperCase()}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">
                        {o.customer_name || users.find((u) => u.id === o.user_id)?.full_name || (o.user_id ? '—' : 'Usuario eliminado')}
                      </div>
                      <div className="text-[11px] text-slate-400">{o.customer_email || users.find((u) => u.id === o.user_id)?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{o.shipping_city}</div>
                      <div className="text-[11px] text-slate-400">{o.shipping_address}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{formatPrice(o.total_amount)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={o.status}
                        onChange={(e) => changeStatus(o, e.target.value)}
                        disabled={o.status === 'cancelado'}
                        className="py-1 px-2 rounded-lg border border-slate-200 font-bold bg-white text-xs focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
                        title={o.status === 'cancelado' ? 'Un pedido cancelado no se puede reabrir' : 'Cambiar estado'}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="procesando">Procesando</option>
                        <option value="enviado">Enviado</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={o.payment_status || 'pendiente'}
                        onChange={(e) => changePayment(o, e.target.value)}
                        className="py-1 px-2 rounded-lg border border-slate-200 font-bold bg-white text-xs focus:ring-1 focus:ring-sky-500"
                      >
                        {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {paymentLabel(o.payment_method)}
                        {o.payment_reference && o.payment_status !== 'pagado' && (
                          <span className="ml-1 font-bold text-amber-600" title={o.payment_reference}>
                            · comprobante enviado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editingTracking?.id === o.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingTracking.tracking_number || ''}
                            onChange={(e) => setEditingTracking({ ...editingTracking, tracking_number: e.target.value })}
                            className="w-32 px-2 py-1 border border-sky-400 rounded text-xs font-mono"
                          />
                          <button onClick={() => saveTracking(o, editingTracking.tracking_number)} className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingTracking(null)} className="p-1 text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{o.tracking_number || 'Sin guía'}</span>
                          <button onClick={() => setEditingTracking(o)} className="text-slate-400 hover:text-sky-600" title="Editar guía">
                            <Pen className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[11px] text-slate-400">{new Date(o.created_at).toLocaleDateString('es-CO')}</span>
                    </td>
                  </tr>
                  {openOrder === o.id && orderForm && (
                    <tr className="bg-slate-50">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <h4 className="font-bold text-slate-800">Artículos</h4>
                            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                              {(o.items || []).map((it) => (
                                <div key={it.id || it.product_id} className="flex justify-between gap-3 px-3 py-2">
                                  <span className="text-slate-700">
                                    {it.name} <span className="text-slate-400">× {it.quantity}</span>
                                  </span>
                                  <strong className="text-slate-900 whitespace-nowrap">{formatPrice(it.quantity * it.unit_price)}</strong>
                                </div>
                              ))}
                              <div className="flex justify-between px-3 py-2 text-slate-500">
                                <span>Envío</span>
                                <span>{Number(o.shipping_cost) > 0 ? formatPrice(o.shipping_cost) : 'Gratis'}</span>
                              </div>
                              <div className="flex justify-between px-3 py-2 font-bold text-slate-900">
                                <span>Total</span>
                                <span>{formatPrice(o.total_amount)}</span>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-400">Medio de pago: <strong>{paymentLabel(o.payment_method)}</strong>{o.payment_reference ? ` · Comprobante: ${o.payment_reference}` : ''}</p>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-bold text-slate-800">Datos de entrega</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                value={orderForm.shipping_city}
                                onChange={(e) => setOrderForm({ ...orderForm, shipping_city: e.target.value })}
                                className={fieldClass}
                                placeholder="Ciudad"
                                aria-label="Ciudad"
                              />
                              <input
                                value={orderForm.shipping_phone}
                                onChange={(e) => setOrderForm({ ...orderForm, shipping_phone: e.target.value })}
                                className={fieldClass}
                                placeholder="Teléfono"
                                aria-label="Teléfono"
                              />
                            </div>
                            <input
                              value={orderForm.shipping_address}
                              onChange={(e) => setOrderForm({ ...orderForm, shipping_address: e.target.value })}
                              className={fieldClass}
                              placeholder="Dirección"
                              aria-label="Dirección"
                            />
                            <textarea
                              rows="2"
                              value={orderForm.notes}
                              onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                              className={fieldClass}
                              placeholder="Notas del pedido"
                              aria-label="Notas"
                            />
                            <div className="flex justify-between gap-2 pt-1">
                              <button onClick={() => removeOrder(o)} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold">
                                <Trash2 className="w-3.5 h-3.5" /> Eliminar pedido
                              </button>
                              <button onClick={() => saveOrderDetails(o)} className="inline-flex items-center gap-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl">
                                <Save className="w-3.5 h-3.5" /> Guardar datos
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && isAdmin && <UsersPanel notify={notify} />}

      {tab === 'categories' && isAdmin && <CategoriesPanel notify={notify} />}

      {tab === 'payments' && isAdmin && <PaymentsPanel notify={notify} />}

      {tab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Libro de Trazabilidad e Historial</h3>
            <span className="text-xs text-slate-500 hidden sm:block">Conforme a la regla de auditoría de inventario</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Fecha y Hora</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Operación</th>
                  <th className="px-4 py-3">Movimiento</th>
                  <th className="px-4 py-3">Stock Resultante</th>
                  <th className="px-4 py-3">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{formatDate(l.created_at)}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{l.product_name || l.product_id}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{l.changed_by_name || 'Sistema'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${LOG_BADGE[l.change_type] || 'bg-amber-100 text-amber-800'}`}>
                        {l.change_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold font-mono">
                      <span className={l.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {l.quantity_change > 0 ? `+${l.quantity_change}` : l.quantity_change}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {l.previous_stock} → <strong className="text-slate-900">{l.new_stock}</strong>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{l.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'new-product' && (
        <div className="max-w-2xl bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-xl font-bold text-slate-900">Registrar Nuevo Producto</h3>
          <form onSubmit={submitProduct} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre del Producto *</label>
                <input type="text" required value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className={fieldClass} placeholder="Ej: Limpiavidrios Antiempañante 500 ml" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Categoría</label>
                <select value={newProduct.category_id} onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })} className={fieldClass}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Precio (pesos colombianos, COP) *</label>
                <input type="number" step="100" min="0" required value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} className={fieldClass} placeholder="Ej: 17900" />
                {Number(newProduct.price) > 0 && <p className="text-[11px] text-slate-400 mt-1">Se mostrará como {formatPrice(newProduct.price)}</p>}
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Stock Inicial *</label>
                <input type="number" min="0" required value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} className={fieldClass} placeholder="0" />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">URL de Imagen</label>
                <input type="url" value={newProduct.image_url} onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })} className={fieldClass} />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Descripción Detallada</label>
                <textarea rows="3" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} className={fieldClass} placeholder="Modo de uso, presentación y beneficios..." />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setTab('inventory')} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold">
                Cancelar
              </button>
              <button type="submit" className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-sm">
                Crear Producto
              </button>
            </div>
          </form>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Editar producto</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nombre *</label>
                  <input required value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} className={fieldClass} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoría</label>
                  <select value={editingProduct.category_id} onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })} className={fieldClass}>
                    <option value="">General (sin categoría)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Precio (COP) *</label>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    required
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    className={fieldClass}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Se mostrará como {formatPrice(editingProduct.price)}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">URL de imagen</label>
                  <div className="flex items-center gap-3">
                    <img src={editingProduct.image_url || DEFAULT_IMAGE} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0" />
                    <input type="url" value={editingProduct.image_url} onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })} className={fieldClass} />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Descripción</label>
                  <textarea rows="3" value={editingProduct.description} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} className={fieldClass} />
                </div>
                <label className="sm:col-span-2 flex items-center gap-2 font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingProduct.is_active}
                    onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  Publicado en la tienda (si lo desmarcas queda como borrador, oculto para clientes)
                </label>
              </div>
              <p className="text-[11px] text-slate-400">
                Stock actual: <strong>{editingProduct.stock} un.</strong> — para cambiarlo usa "Ajustar Stock", así queda registrado en la auditoría.
              </p>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-sm">
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {adjust.open && adjust.product && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Ajuste de Existencias</h3>
                <p className="text-xs text-slate-500">{adjust.product.name}</p>
              </div>
              <button onClick={() => setAdjust({ ...adjust, open: false })} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitAdjust} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                <span className="text-slate-600">Stock Actual en Bodega:</span>
                <strong className="text-base text-slate-900">{adjust.product.stock} un.</strong>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Movimiento</label>
                <select value={adjust.type} onChange={(e) => setAdjust({ ...adjust, type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium">
                  <option value="ingreso">Ingreso (+ Abastecimiento)</option>
                  <option value="egreso">Egreso (- Merma / Salida)</option>
                  <option value="ajuste">Ajuste de Conteo Físico (+)</option>
                  <option value="devolucion">Devolución (+ Retorno)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cantidad de Unidades</label>
                <input type="number" min="1" required value={adjust.delta} onChange={(e) => setAdjust({ ...adjust, delta: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-sm" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Motivo / Notas de Auditoría *</label>
                <input type="text" required placeholder="Ej: Recepción lote proveedor #402" value={adjust.notes} onChange={(e) => setAdjust({ ...adjust, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setAdjust({ ...adjust, open: false })} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-sm">
                  Registrar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
