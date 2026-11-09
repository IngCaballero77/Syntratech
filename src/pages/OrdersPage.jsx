import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Package, Clock, ChevronUp, ChevronDown, CircleX, Truck, FileText } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice, formatDate, PAYMENT_STATUS_LABELS } from '../lib/format';
import { paymentLabel } from '../lib/payments';
import PaymentBox from '../components/PaymentBox';

const STEPS = [
  { key: 'pendiente', label: 'Pendiente', desc: 'Recibido en sistema' },
  { key: 'procesando', label: 'Procesando', desc: 'En preparación de bodega' },
  { key: 'enviado', label: 'Enviado', desc: 'En ruta con guía de despacho' },
  { key: 'entregado', label: 'Entregado', desc: 'Recibido por el destinatario' },
];

const FILTERS = ['all', 'pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];

const STATUS_BADGE = {
  entregado: 'bg-emerald-100 text-emerald-800',
  enviado: 'bg-sky-100 text-sky-800',
  procesando: 'bg-amber-100 text-amber-800',
  cancelado: 'bg-rose-100 text-rose-800',
};


const shortId = (id) => (String(id).length > 14 ? String(id).slice(0, 8).toUpperCase() : id);

export default function OrdersPage() {
  const { orders, products, updateOrderStatus } = useStore();
  const { user, isAdmin } = useAuth();
  const [expanded, setExpanded] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const visible = orders.filter((o) => {
    if (!isAdmin && o.user_id !== user?.id) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    const term = search.trim().toLowerCase();
    if (term) {
      const match =
        String(o.id).toLowerCase().includes(term) ||
        (o.tracking_number || '').toLowerCase().includes(term) ||
        (o.shipping_city || '').toLowerCase().includes(term);
      if (!match) return false;
    }
    return true;
  });

  const cancelOrder = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas cancelar este pedido? Se liberarán las existencias.')) {
      await updateOrderStatus(id, 'cancelado');
    }
  };

  const itemName = (item) => item.name || products.find((p) => p.id === item.product_id)?.name || 'Producto';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Seguimiento de Pedidos y Envíos</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAdmin
              ? 'Mostrando todos los pedidos del sistema con permisos de administrador.'
              : 'Historial y trazabilidad en tiempo real de tus pedidos comunitarios.'}
          </p>
        </div>
        {isAdmin && (
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <span>Modo Operativo: Visión Global de Pedidos</span>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ID, guía o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition ${
                statusFilter === s ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'all' ? 'Todos' : s}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center max-w-md mx-auto space-y-3">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No hay pedidos registrados</h3>
          <p className="text-xs text-slate-500">
            {search || statusFilter !== 'all'
              ? 'No hay pedidos que coincidan con tus criterios de búsqueda.'
              : 'Aún no has efectuado ningún pedido.'}
          </p>
          <Link to="/catalogo" className="inline-block mt-3 bg-sky-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-sky-700 transition">
            Explorar Catálogo
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {visible.map((o) => {
            const stepIndex = STEPS.findIndex((s) => s.key === o.status);
            const isOpen = expanded === o.id;
            const cancelled = o.status === 'cancelado';
            return (
              <div key={o.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition">
                <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-base font-extrabold text-slate-900" title={o.id}>
                        {shortId(o.id)}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${STATUS_BADGE[o.status] || 'bg-slate-200 text-slate-800'}`}>
                        {o.status}
                      </span>
                      {!cancelled && o.payment_status !== 'pagado' && o.payment_method !== 'contra_entrega' && (
                        <button
                          type="button"
                          onClick={() => setExpanded(o.id)}
                          className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200"
                        >
                          {o.payment_status === 'fallido' ? 'Pago fallido' : 'Pago pendiente'}
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDate(o.created_at)}</span>
                      <span>•</span>
                      <span>
                        Destino: <strong>{o.shipping_city}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block font-medium">Total</span>
                      <span className="text-xl font-black text-slate-900">{formatPrice(o.total_amount)}</span>
                    </div>
                    <button
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                      title={isOpen ? 'Ocultar detalles' : 'Ver detalles'}
                    >
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {cancelled ? (
                  <div className="p-4 bg-rose-50/50 border-b border-rose-100 flex items-center gap-2 text-rose-800 text-xs font-semibold">
                    <CircleX className="w-4 h-4" />
                    <span>Este pedido se encuentra cancelado. Las existencias fueron reintegradas al inventario.</span>
                  </div>
                ) : (
                  <div className="p-6 bg-white border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-sky-600" /> Trazabilidad de Despacho
                      </span>
                      {o.tracking_number && (
                        <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          Guía: <strong>{o.tracking_number}</strong>
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {STEPS.map((step, idx) => {
                        const done = stepIndex >= idx;
                        const current = stepIndex === idx;
                        return (
                          <div key={step.key} className="flex flex-col space-y-1 relative">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition ${
                                  done ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'
                                }`}
                              >
                                {done ? '✓' : idx + 1}
                              </div>
                              <span className={`text-xs font-bold ${current ? 'text-sky-600' : done ? 'text-slate-800' : 'text-slate-400'}`}>
                                {step.label}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 pl-9">{step.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isOpen && (
                  <div className="p-6 bg-slate-50/30 space-y-6">
                    {o.user_id === user?.id && <PaymentBox order={o} customer={{ email: user?.email, phone: o.shipping_phone }} />}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                      <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                          <Truck className="w-4 h-4 text-sky-600" /> Información de Envío
                        </h4>
                        <p><strong className="text-slate-600">Dirección:</strong> {o.shipping_address}</p>
                        <p><strong className="text-slate-600">Ciudad:</strong> {o.shipping_city}</p>
                        <p><strong className="text-slate-600">Teléfono:</strong> {o.shipping_phone}</p>
                        {o.notes && <p><strong className="text-slate-600">Notas:</strong> {o.notes}</p>}
                      </div>
                      <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                          <FileText className="w-4 h-4 text-emerald-600" /> Datos de Pago
                        </h4>
                        <p><strong className="text-slate-600">Método:</strong> {paymentLabel(o.payment_method)}</p>
                        <p>
                          <strong className="text-slate-600">Estado de Pago:</strong> {PAYMENT_STATUS_LABELS[o.payment_status] || o.payment_status}
                        </p>
                        {o.payment_reference && (
                          <p><strong className="text-slate-600">Comprobante:</strong> {o.payment_reference}</p>
                        )}
                        <p><strong className="text-slate-600">Guía de Logística:</strong> {o.tracking_number || 'Por asignar'}</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700">Artículos del Pedido</div>
                      <div className="divide-y divide-slate-100">
                        {(o.items || []).map((item, idx) => (
                          <div key={item.id || idx} className="px-4 py-3 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800">{itemName(item)}</span>
                            <div className="space-x-4 text-slate-600">
                              <span>
                                {item.quantity} un. × {formatPrice(item.unit_price)}
                              </span>
                              <strong className="text-slate-900">{formatPrice(item.quantity * item.unit_price)}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {o.status === 'pendiente' && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => cancelOrder(o.id)}
                          className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl transition"
                        >
                          Cancelar Pedido
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
