// Supabase Edge Function: wompi-firma
// Devuelve los datos para abrir el widget de Wompi de un pedido, con la firma de integridad.
// La firma se calcula aquí (servidor) porque usa el secreto de integridad, que nunca va en la web.
//
// Secretos necesarios (Supabase → Edge Functions → Secrets):
//   WOMPI_INTEGRITY_SECRET = test_integrity_... (pruebas) o prod_integrity_... (producción)
// Despliegue:  supabase functions deploy wompi-firma
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const secret = Deno.env.get('WOMPI_INTEGRITY_SECRET');
  if (!secret) return json({ error: 'Falta configurar WOMPI_INTEGRITY_SECRET en Supabase.' }, 500);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  // Quién está pidiendo la firma.
  const asUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await asUser.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'Debes iniciar sesión.' }, 401);

  let orderId = '';
  try {
    ({ order_id: orderId } = await req.json());
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: order, error } = await admin
    .from('orders')
    .select('id, user_id, total_amount, status, payment_status, payment_method')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order || order.user_id !== user.id) return json({ error: 'Pedido no encontrado.' }, 404);
  if (order.status === 'cancelado') return json({ error: 'Este pedido está cancelado.' }, 400);
  if (order.payment_status === 'pagado') return json({ error: 'Este pedido ya está pagado.' }, 400);
  if (order.payment_method !== 'wompi') return json({ error: 'Este pedido no se paga con Wompi.' }, 400);

  // Referencia única por intento de pago: <id del pedido>_<marca de tiempo>.
  const reference = `${order.id}_${Date.now()}`;
  const amountInCents = Math.round(Number(order.total_amount)) * 100;
  const currency = 'COP';
  const integrity = await sha256Hex(`${reference}${amountInCents}${currency}${secret}`);

  return json({ reference, amountInCents, currency, integrity, email: user.email });
});
