import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CircleAlert, CircleCheck, Truck, CreditCard, Banknote, ShieldCheck, Smartphone, Landmark, Wallet } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice, shippingCost } from '../lib/format';
import { PAYMENT_METHODS, availableMethods, paymentLabel } from '../lib/payments';
import PaymentBox from '../components/PaymentBox';

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500';

const METHOD_ICON = {
  wompi: [CreditCard, 'text-indigo-600'],
  nequi: [Smartphone, 'text-fuchsia-600'],
  bancolombia: [Landmark, 'text-amber-500'],
  nu: [Wallet, 'text-purple-600'],
  contra_entrega: [Banknote, 'text-sky-600'],
};

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { placeOrder, paymentSettings, orders, payWithWompi } = useStore();
  const { profile, user } = useAuth();
  const methods = availableMethods(paymentSettings);

  const [form, setForm] = useState({
    fullName: profile?.full_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    city: profile?.city || 'Bogotá',
    notes: '',
    paymentMethod: methods[0],
  });

  // Si los medios disponibles cambian (al cargar los datos de pago), se elige uno válido.
  useEffect(() => {
    if (!methods.includes(form.paymentMethod)) setForm((f) => ({ ...f, paymentMethod: methods[0] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methods.join(',')]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmed, setConfirmed] = useState(null);

  const shipping = shippingCost(subtotal);
  const total = subtotal + shipping;

  if (items.length === 0 && !confirmed) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-slate-200 text-center">
        <h2 className="text-xl font-bold text-slate-800">No hay productos en el carrito</h2>
        <p className="text-xs text-slate-500 mt-2 mb-6">Agrega productos al carrito antes de tramitar el pedido.</p>
        <Link to="/catalogo" className="bg-sky-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl">
          Ir al Catálogo
        </Link>
      </div>
    );
  }

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.fullName || !form.phone || !form.address || !form.city) {
      setError('Por favor completa todos los campos de envío obligatorios.');
      return;
    }
    setSubmitting(true);
    try {
      const order = await placeOrder(form, items);
      clearCart();
      const placed = { status: 'pendiente', payment_status: 'pendiente', ...order };
      setConfirmed(placed);
      // Pago en línea: se abre la pasarela de inmediato (si falla, queda el botón "Pagar ahora").
      if (placed.payment_method === 'wompi') {
        payWithWompi(placed, { email: user?.email, fullName: form.fullName, phone: form.phone }).catch(() => {});
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error al procesar el pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 sm:p-10 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CircleCheck className="w-10 h-10" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">¡Pedido Confirmado con Éxito!</span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">Gracias por tu compra comunitaria</h1>
          <p className="text-sm text-slate-600 mt-2">
            El pedido ha sido registrado con el identificador <strong className="text-slate-900">{confirmed.id}</strong>.
            Las existencias han sido descontadas y asignadas a tu despacho.
          </p>
        </div>
        <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-left space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-sky-800 font-semibold flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-sky-600" /> Guía de Trazabilidad Asignada:
            </span>
            <span className="font-mono text-xs font-bold text-sky-900 bg-white px-2 py-0.5 rounded border border-sky-300">
              {confirmed.tracking_number}
            </span>
          </div>
          <div className="text-xs text-sky-700">
            Destino: <strong>{confirmed.shipping_address}, {confirmed.shipping_city}</strong>
          </div>
          <div className="text-xs text-sky-700">
            Total a liquidar: <strong>{formatPrice(confirmed.total_amount)}</strong> ({paymentLabel(confirmed.payment_method)})
          </div>
        </div>
        <div className="text-left">
          <PaymentBox
            order={orders.find((o) => o.id === confirmed.id) || confirmed}
            customer={{ email: user?.email, fullName: form.fullName, phone: form.phone }}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Link to="/pedidos" className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-xl transition text-sm">
            Ver Mis Pedidos y Trazabilidad
          </Link>
          <Link to="/catalogo" className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl transition text-sm">
            Seguir Comprando
          </Link>
        </div>
      </div>
    );
  }

  const payOption = (value, Icon, iconColor, title, text) => (
    <label
      className={`p-4 rounded-xl border-2 cursor-pointer flex flex-col gap-2 transition ${
        form.paymentMethod === value ? 'border-sky-600 bg-sky-50/50' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <Icon className={`w-6 h-6 ${iconColor}`} />
        <input
          type="radio"
          name="paymentMethod"
          value={value}
          checked={form.paymentMethod === value}
          onChange={onChange}
          className="w-4 h-4 text-sky-600"
        />
      </div>
      <div>
        <div className="font-bold text-sm text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">{text}</div>
      </div>
    </label>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link to="/carrito" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al carrito
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-900">Finalizar Compra y Despacho</h1>
        <p className="text-slate-500 text-sm mt-1">Completa los datos para registrar la guía de envío y entrega.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
          <CircleAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-sky-600" />
              <span>Dirección de Despacho</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input type="text" name="fullName" required value={form.fullName} onChange={onChange} className={inputClass} placeholder="Ej: Carlos Mendoza" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono Móvil *</label>
                <input type="tel" name="phone" required value={form.phone} onChange={onChange} className={inputClass} placeholder="+57 300 000 0000" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Dirección de Entrega *</label>
                <input type="text" name="address" required value={form.address} onChange={onChange} className={inputClass} placeholder="Calle, Carrera, Edificio, Apto..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ciudad / Municipio *</label>
                <input type="text" name="city" required value={form.city} onChange={onChange} className={inputClass} placeholder="Bogotá, Medellín, etc." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Instrucciones o Notas</label>
                <input type="text" name="notes" value={form.notes} onChange={onChange} className={inputClass} placeholder="Dejar en portería..." />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-sky-600" />
              <span>Método de Pago</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {methods.map((m) => {
                const [Icon, color] = METHOD_ICON[m] || [CreditCard, 'text-slate-500'];
                return <Fragment key={m}>{payOption(m, Icon, color, PAYMENT_METHODS[m].label, PAYMENT_METHODS[m].text)}</Fragment>;
              })}
            </div>
            {methods.length === 1 && methods[0] === 'contra_entrega' && (
              <p className="text-[11px] text-slate-400">
                Pronto podrás pagar también con Nequi, Bancolombia, Nu y tarjeta.
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">Resumen del Pedido ({items.length} productos)</h2>
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 pr-1">
            {items.map((i) => (
              <div key={i.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <img src={i.image_url} alt={i.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800 line-clamp-1">{i.name}</div>
                    <div className="text-xs text-slate-500">
                      Cant: {i.quantity} × {formatPrice(i.price)}
                    </div>
                  </div>
                </div>
                <div className="font-bold text-slate-900 shrink-0">{formatPrice(i.price * i.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-4 border-t border-slate-100 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Costo de Envío</span>
              <span className="font-semibold text-slate-900">{shipping === 0 ? 'GRATIS' : formatPrice(shipping)}</span>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
              <span className="text-base font-bold text-slate-900">Total a Pagar</span>
              <span className="text-2xl font-black text-sky-600">{formatPrice(total)}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-sky-600/30 transition text-sm"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Procesando e inventariando...</span>
              </span>
            ) : (
              <span>{form.paymentMethod === 'wompi' ? 'Confirmar y pagar en línea' : 'Confirmar y Despachar Pedido'}</span>
            )}
          </button>
          <div className="text-[11px] text-slate-500 flex items-center gap-2 justify-center pt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Validación automática contra inventario central</span>
          </div>
        </div>
      </form>
    </div>
  );
}
