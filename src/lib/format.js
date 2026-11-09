// Utilidades de presentación compartidas por las páginas.

// Precios en pesos colombianos, sin decimales: $ 17.900
const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatPrice = (value) => copFormatter.format(Math.round(Number(value) || 0));

export const stockBadgeClass = (stock) =>
  stock > 10
    ? 'bg-emerald-100 text-emerald-800'
    : stock > 0
      ? 'bg-amber-100 text-amber-800'
      : 'bg-rose-100 text-rose-800';

// Envío: gratis desde $150.000; si no, tarifa fija de $12.000.
// Debe coincidir con la función place_order de la base de datos (migración 0004).
export const FREE_SHIPPING_FROM = 150000;
export const SHIPPING_FEE = 12000;
export const shippingCost = (subtotal) => (subtotal >= FREE_SHIPPING_FROM || subtotal === 0 ? 0 : SHIPPING_FEE);

export const ORDER_STATUSES = ['pendiente', 'procesando', 'enviado', 'entregado'];

export const STATUS_LABELS = {
  pendiente: 'Pendiente',
  procesando: 'Procesando',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const PAYMENT_STATUS_LABELS = {
  pendiente: 'Pago pendiente',
  pagado: 'Pagado',
  reembolsado: 'Reembolsado',
  fallido: 'Fallido',
};

export const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
};
