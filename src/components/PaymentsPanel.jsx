import { useEffect, useState } from 'react';
import { Wallet, Smartphone, Landmark, CreditCard, Banknote, Save, ExternalLink } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { availableMethods, PAYMENT_METHODS } from '../lib/payments';

const fieldClass = 'w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 text-xs';

function Section({ icon: Icon, color, title, children, hint }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${color}`} />
        <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
      </div>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

// Datos de pago que ve el cliente en el checkout (solo administrador).
// Un medio aparece en la tienda en cuanto tiene sus datos completos.
export default function PaymentsPanel({ notify }) {
  const { paymentSettings, updatePaymentSettings } = useStore();
  const [form, setForm] = useState(paymentSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(paymentSettings), [paymentSettings]);

  const set = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePaymentSettings(form);
      notify('success', 'Datos de pago guardados. Ya se ven en el checkout.');
    } catch (err) {
      notify('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const active = availableMethods(form);

  return (
    <form onSubmit={save} className="space-y-6 text-xs">
      <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-sky-900">
        <strong>Medios activos en la tienda:</strong> {active.map((m) => PAYMENT_METHODS[m].label).join(' · ')}
        <p className="text-[11px] text-sky-700 mt-1">
          Un medio aparece en el checkout en cuanto llenas sus datos. Los pagos por transferencia los confirmas tú en
          Pedidos → columna Pago, después de revisar el comprobante en tu app.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section icon={Wallet} color="text-slate-600" title="Titular de las cuentas" hint="Se muestra al cliente para que confirme a quién le transfiere.">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nombre del titular</label>
              <input name="titular" value={form.titular || ''} onChange={set} className={fieldClass} placeholder="Syntratech S.A.S." />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">NIT o cédula (opcional)</label>
              <input name="documento" value={form.documento || ''} onChange={set} className={fieldClass} placeholder="NIT 900.000.000-0" />
            </div>
          </div>
        </Section>

        <Section icon={Banknote} color="text-sky-600" title="Contra entrega">
          <label className="flex items-center gap-2 font-bold text-slate-700">
            <input type="checkbox" name="contra_entrega" checked={!!form.contra_entrega} onChange={set} className="w-4 h-4 rounded" />
            Aceptar pago en efectivo o datáfono al entregar
          </label>
        </Section>

        <Section icon={Smartphone} color="text-fuchsia-600" title="Nequi">
          <label className="block font-bold text-slate-700 mb-1">Número celular de Nequi</label>
          <input name="nequi_numero" value={form.nequi_numero || ''} onChange={set} className={fieldClass} placeholder="300 123 4567" />
        </Section>

        <Section icon={Landmark} color="text-amber-500" title="Bancolombia">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipo</label>
              <select name="bancolombia_tipo" value={form.bancolombia_tipo || 'Ahorros'} onChange={set} className={fieldClass}>
                <option>Ahorros</option>
                <option>Corriente</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Número de cuenta</label>
              <input name="bancolombia_numero" value={form.bancolombia_numero || ''} onChange={set} className={fieldClass} placeholder="123-456789-01" />
            </div>
          </div>
        </Section>

        <Section icon={Wallet} color="text-purple-600" title="Nu" hint="La llave Bre-B (por ejemplo @tutienda o tu celular) con la que te transfieren desde Nu u otros bancos.">
          <label className="block font-bold text-slate-700 mb-1">Llave o celular</label>
          <input name="nu_llave" value={form.nu_llave || ''} onChange={set} className={fieldClass} placeholder="@syntratech o 300 123 4567" />
        </Section>

        <Section
          icon={CreditCard}
          color="text-indigo-600"
          title="Tarjetas de crédito y débito, PSE y Nequi en línea (Wompi)"
          hint="Requiere una cuenta de comercio en Wompi y desplegar las funciones wompi-firma y wompi-webhook. Pasos en GUIA_PAGOS.md."
        >
          <label className="flex items-center gap-2 font-bold text-slate-700">
            <input type="checkbox" name="wompi_activo" checked={!!form.wompi_activo} onChange={set} className="w-4 h-4 rounded" />
            Activar pago en línea con Wompi
          </label>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Llave pública</label>
            <input
              name="wompi_llave_publica"
              value={form.wompi_llave_publica || ''}
              onChange={set}
              className={`${fieldClass} font-mono`}
              placeholder="pub_test_... o pub_prod_..."
              autoComplete="off"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Solo la llave <strong>pública</strong>. Las llaves privadas y secretos van en Supabase, nunca aquí.
            </p>
          </div>
          <a
            href="https://comercios.wompi.co"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700"
          >
            Abrir panel de comercios de Wompi <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </Section>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <label className="block font-bold text-slate-700 mb-1">Instrucciones adicionales para transferencias (opcional)</label>
        <textarea
          name="instrucciones"
          rows="2"
          value={form.instrucciones || ''}
          onChange={set}
          className={fieldClass}
          placeholder="Ej: Envía el pantallazo al WhatsApp 300 000 0000. Despachamos al confirmar el pago."
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-sm"
        >
          <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar datos de pago'}
        </button>
      </div>
    </form>
  );
}
