// Medios de pago de la tienda.
// Los datos (número de Nequi, cuenta Bancolombia, llave de Nu, llave pública de Wompi)
// se guardan en la tabla payment_settings y se editan en el panel → pestaña Pagos.

export const EMPTY_PAYMENT_SETTINGS = {
  titular: '',
  documento: '',
  contra_entrega: true,
  nequi_numero: '',
  bancolombia_tipo: 'Ahorros',
  bancolombia_numero: '',
  nu_llave: '',
  wompi_activo: false,
  wompi_llave_publica: '',
  instrucciones: '',
};

export const PAYMENT_METHODS = {
  wompi: {
    label: 'Tarjeta, PSE o Nequi en línea',
    short: 'Wompi (en línea)',
    text: 'Crédito, débito, PSE, Nequi o botón Bancolombia con la pasarela segura Wompi.',
    online: true,
  },
  nequi: { label: 'Nequi', short: 'Nequi', text: 'Transfiere desde tu app Nequi y escribe el comprobante.' },
  bancolombia: {
    label: 'Transferencia Bancolombia',
    short: 'Bancolombia',
    text: 'Transfiere desde la app Bancolombia o cualquier banco.',
  },
  nu: { label: 'Nu', short: 'Nu', text: 'Transfiere desde tu app Nu con la llave o el celular.' },
  contra_entrega: {
    label: 'Contra entrega',
    short: 'Contra entrega',
    text: 'Paga en efectivo o con datáfono al recibir tu pedido.',
  },
  // Pedidos antiguos.
  tarjeta: { label: 'Tarjeta', short: 'Tarjeta', text: '' },
};

export const paymentLabel = (method) => PAYMENT_METHODS[method]?.short || method || '—';

export const isManualTransfer = (method) => ['nequi', 'bancolombia', 'nu'].includes(method);

// Medios que se muestran en el checkout: solo los que tienen sus datos completos.
export function availableMethods(settings) {
  const s = settings || EMPTY_PAYMENT_SETTINGS;
  const out = [];
  if (s.wompi_activo && s.wompi_llave_publica) out.push('wompi');
  if (s.nequi_numero) out.push('nequi');
  if (s.bancolombia_numero) out.push('bancolombia');
  if (s.nu_llave) out.push('nu');
  if (s.contra_entrega || out.length === 0) out.push('contra_entrega');
  return out;
}

// Datos que el cliente debe usar para transferir con cada medio manual.
export function transferDetails(method, settings) {
  const s = settings || EMPTY_PAYMENT_SETTINGS;
  const holder = [s.titular, s.documento].filter(Boolean).join(' · ');
  if (method === 'nequi') return [['Celular Nequi', s.nequi_numero], ['Titular', holder]];
  if (method === 'bancolombia')
    return [['Cuenta de ' + (s.bancolombia_tipo || 'Ahorros') + ' Bancolombia', s.bancolombia_numero], ['Titular', holder]];
  if (method === 'nu') return [['Llave / celular Nu', s.nu_llave], ['Titular', holder]];
  return [];
}

// ——— Wompi ———
const WOMPI_SCRIPT = 'https://checkout.wompi.co/widget.js';
let wompiLoading = null;

function loadWompi() {
  if (window.WidgetCheckout) return Promise.resolve();
  if (!wompiLoading) {
    wompiLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = WOMPI_SCRIPT;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        wompiLoading = null;
        reject(new Error('No se pudo cargar la pasarela de pagos Wompi. Revisa tu conexión.'));
      };
      document.head.appendChild(s);
    });
  }
  return wompiLoading;
}

// Abre el widget de Wompi. `signed` viene de la función wompi-firma (referencia, monto y firma).
// Devuelve la transacción que informa el widget (su estado final lo confirma el webhook).
export async function openWompiCheckout({ publicKey, signed, customer }) {
  await loadWompi();
  return new Promise((resolve) => {
    const checkout = new window.WidgetCheckout({
      currency: signed.currency,
      amountInCents: signed.amountInCents,
      reference: signed.reference,
      publicKey,
      signature: { integrity: signed.integrity },
      redirectUrl: `${window.location.origin}/pedidos`,
      customerData: {
        email: customer?.email || signed.email,
        fullName: customer?.fullName || undefined,
        phoneNumber: (customer?.phone || '').replace(/\D/g, '').slice(-10) || undefined,
        phoneNumberPrefix: '+57',
      },
    });
    checkout.open((result) => resolve(result?.transaction || null));
  });
}

export const WOMPI_STATUS_TEXT = {
  APPROVED: '¡Pago aprobado! En unos segundos tu pedido aparecerá como pagado.',
  PENDING: 'Tu pago está en proceso. Te avisaremos cuando se confirme.',
  DECLINED: 'El pago fue rechazado. Puedes intentarlo de nuevo con otro medio.',
  VOIDED: 'El pago fue anulado.',
  ERROR: 'Hubo un error con el pago. Inténtalo de nuevo.',
};
