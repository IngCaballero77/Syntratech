// Supabase Edge Function: wompi-webhook
// Wompi llama a esta dirección cada vez que una transacción cambia de estado.
// Verifica la firma del evento y marca el pedido como pagado (o fallido).
//
// Secretos necesarios (Supabase → Edge Functions → Secrets):
//   WOMPI_EVENTS_SECRET = test_events_... (pruebas) o prod_events_... (producción)
// Despliegue (sin verificación JWT, porque quien llama es Wompi):
//   supabase functions deploy wompi-webhook --no-verify-jwt
// URL para pegar en Wompi → Desarrolladores → URL de eventos:
//   https://<tu-proyecto>.supabase.co/functions/v1/wompi-webhook
import { createClient } from 'npm:@supabase/supabase-js@2';

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Lee "transaction.amount_in_cents" dentro de data.
const pick = (obj: Record<string, unknown>, path: string) =>
  path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 });

  const secret = Deno.env.get('WOMPI_EVENTS_SECRET');
  if (!secret) return new Response('Falta WOMPI_EVENTS_SECRET', { status: 500 });

  let event: any;
  try {
    event = await req.json();
  } catch {
    return new Response('JSON inválido', { status: 400 });
  }

  // Firma: valores de signature.properties (en orden) + timestamp + secreto de eventos, en SHA-256.
  const properties: string[] = event?.signature?.properties ?? [];
  const concatenated = properties.map((p) => String(pick(event.data ?? {}, p) ?? '')).join('') + String(event.timestamp) + secret;
  const checksum = await sha256Hex(concatenated);
  const received = String(event?.signature?.checksum ?? req.headers.get('x-event-checksum') ?? '');
  if (checksum.toLowerCase() !== received.toLowerCase()) {
    return new Response('Firma inválida', { status: 401 });
  }

  if (event.event !== 'transaction.updated') return new Response('ok');

  const tx = event.data?.transaction ?? {};
  const orderId = String(tx.reference ?? '').split('_')[0];
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: order } = await admin
    .from('orders')
    .select('id, total_amount, payment_status, notes')
    .eq('id', orderId)
    .maybeSingle();
  // Respondemos 200 aunque no exista, para que Wompi no reintente sin sentido.
  if (!order) return new Response('ok');
  if (order.payment_status === 'pagado') return new Response('ok');

  const receipt = `Wompi ${tx.id} (${tx.payment_method_type ?? 'pago'})`;

  if (tx.status === 'APPROVED') {
    const expected = Math.round(Number(order.total_amount)) * 100;
    if (Number(tx.amount_in_cents) !== expected) {
      // El monto no coincide con el pedido: no se marca como pagado; queda la nota para revisar.
      await admin
        .from('orders')
        .update({
          wompi_transaction_id: tx.id,
          payment_reference: receipt,
          notes: `${order.notes ?? ''}\n[Revisar] Wompi aprobó ${tx.amount_in_cents / 100} COP pero el pedido es ${expected / 100} COP.`.trim(),
        })
        .eq('id', order.id);
      return new Response('ok');
    }
    await admin
      .from('orders')
      .update({ payment_status: 'pagado', wompi_transaction_id: tx.id, payment_reference: receipt })
      .eq('id', order.id);
  } else if (['DECLINED', 'ERROR', 'VOIDED'].includes(tx.status)) {
    await admin
      .from('orders')
      .update({ payment_status: 'fallido', wompi_transaction_id: tx.id, payment_reference: receipt })
      .eq('id', order.id);
  }

  return new Response('ok');
});
