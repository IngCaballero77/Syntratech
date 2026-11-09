import { useState } from 'react';
import { Copy, Check, CreditCard, Receipt, CircleCheck, CircleAlert, Clock } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../lib/format';
import { PAYMENT_METHODS, isManualTransfer, transferDetails, WOMPI_STATUS_TEXT } from '../lib/payments';

function CopyValue({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value).replace(/\s/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* el navegador no permite copiar */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700"
      title="Copiar"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

// Muestra cómo pagar un pedido y su estado de pago.
// - Transferencia (Nequi, Bancolombia, Nu): datos de la cuenta + campo para el comprobante.
// - Wompi: botón para pagar en línea.
export default function PaymentBox({ order, customer }) {
  const { paymentSettings, submitPaymentReference, payWithWompi } = useStore();
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  if (!order) return null;
  const method = order.payment_method;
  const status = order.payment_status || 'pendiente';
  const total = formatPrice(order.total_amount);

  if (order.status === 'cancelado') return null;

  if (status === 'pagado') {
    return (
      <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-start gap-2">
        <CircleCheck className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>Pago confirmado.</strong> {order.payment_reference ? `Comprobante: ${order.payment_reference}` : ''}
        </div>
      </div>
    );
  }

  if (method === 'contra_entrega' || method === 'tarjeta') {
    return (
      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 text-xs">
        Pagas <strong>{total}</strong> al recibir tu pedido, en efectivo o con datáfono.
      </div>
    );
  }

  const run = async (fn) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (method === 'wompi') {
    const pay = () =>
      run(async () => {
        const tx = await payWithWompi(order, customer);
        if (tx?.status) setMessage({ type: tx.status === 'APPROVED' ? 'success' : 'info', text: WOMPI_STATUS_TEXT[tx.status] || tx.status });
      });
    return (
      <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 space-y-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-indigo-900">
          <CreditCard className="w-4 h-4" />
          {status === 'fallido' ? 'El pago anterior no se completó' : 'Pago en línea pendiente'}
        </div>
        <p className="text-indigo-800">
          Paga <strong>{total}</strong> con tarjeta de crédito o débito, PSE, Nequi o botón Bancolombia en la
          pasarela segura Wompi.
        </p>
        <button
          type="button"
          onClick={pay}
          disabled={busy}
          className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl"
        >
          {busy ? 'Abriendo pasarela...' : status === 'fallido' ? 'Intentar de nuevo' : `Pagar ${total} ahora`}
        </button>
        {message && <Feedback message={message} />}
      </div>
    );
  }

  if (isManualTransfer(method)) {
    const details = transferDetails(method, paymentSettings);
    const send = (e) => {
      e.preventDefault();
      run(async () => {
        await submitPaymentReference(order.id, reference);
        setReference('');
        setMessage({ type: 'success', text: 'Comprobante recibido. Te confirmamos el pago en cuanto lo verifiquemos.' });
      });
    };
    return (
      <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/60 space-y-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-amber-900">
          <Receipt className="w-4 h-4" />
          Transfiere {total} por {PAYMENT_METHODS[method]?.label}
        </div>
        <dl className="grid gap-2">
          {details
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-amber-100 px-3 py-2">
                <div>
                  <dt className="text-[11px] text-slate-500">{k}</dt>
                  <dd className="font-bold text-slate-900 font-mono">{v}</dd>
                </div>
                {k !== 'Titular' && <CopyValue value={v} />}
              </div>
            ))}
          <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-amber-100 px-3 py-2">
            <div>
              <dt className="text-[11px] text-slate-500">Valor exacto</dt>
              <dd className="font-bold text-slate-900">{total}</dd>
            </div>
            <CopyValue value={Math.round(Number(order.total_amount))} />
          </div>
        </dl>
        {paymentSettings.instrucciones && <p className="text-amber-900">{paymentSettings.instrucciones}</p>}

        {order.payment_reference ? (
          <div className="flex items-start gap-2 text-amber-900">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Comprobante enviado: <strong>{order.payment_reference}</strong>. Estamos verificando tu pago.
            </span>
          </div>
        ) : (
          <form onSubmit={send} className="flex flex-col sm:flex-row gap-2">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={80}
              placeholder="Número de comprobante de la transferencia"
              aria-label="Número de comprobante"
              className="flex-1 px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button type="submit" disabled={busy} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white font-bold rounded-xl">
              {busy ? 'Enviando...' : 'Ya pagué'}
            </button>
          </form>
        )}
        {message && <Feedback message={message} />}
      </div>
    );
  }

  return null;
}

function Feedback({ message }) {
  const styles = {
    success: 'text-emerald-700',
    info: 'text-sky-700',
    error: 'text-rose-700',
  };
  return (
    <p className={`flex items-start gap-1.5 font-semibold ${styles[message.type]}`}>
      {message.type === 'error' ? <CircleAlert className="w-4 h-4 shrink-0" /> : <CircleCheck className="w-4 h-4 shrink-0" />}
      {message.text}
    </p>
  );
}
