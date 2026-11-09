import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, IS_CONNECTED } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { SEED_CATEGORIES, SEED_PRODUCTS, SEED_ORDERS, SEED_INVENTORY_LOGS, DEMO_PROFILES } from '../data/seedData';
import { shippingCost } from '../lib/format';
import { EMPTY_PAYMENT_SETTINGS, openWompiCheckout } from '../lib/payments';

// Datos de ejemplo para el modo demostración (no son cuentas reales).
const DEMO_PAYMENT_SETTINGS = {
  ...EMPTY_PAYMENT_SETTINGS,
  titular: 'Syntratech S.A.S. (demo)',
  nequi_numero: '300 000 0000',
  bancolombia_numero: '000-000000-00',
  nu_llave: '@syntratech',
};

const StoreContext = createContext();

// ——— Persistencia local (solo modo demostración) ———
const readLocal = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
};
const writeLocal = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible */
  }
};

// "_cop": versión con precios en pesos (descarta datos de demostración guardados en dólares).
const KEYS = {
  categories: 'syntratech_categories_v3',
  products: 'syntratech_products_v3',
  orders: 'syntratech_orders_cop2',
  logs: 'syntratech_inventory_logs_cop',
};

// Error de "la función RPC no existe" → falta ejecutar una migración en Supabase.
const isMissingRpc = (error) => error?.code === 'PGRST202' || error?.code === '42883';
const MIGRATION_0004 = 'Falta ejecutar supabase/migrations/0004_pesos_y_gestion_admin.sql en Supabase (SQL Editor).';

const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const fail = (error, fallbackMsg) => {
  throw new Error(error?.message ? `${fallbackMsg}: ${error.message}` : fallbackMsg);
};

export function StoreProvider({ children }) {
  const { user, profile, isAdmin, isStaff } = useAuth();

  const [categories, setCategories] = useState(() => (IS_CONNECTED ? [] : readLocal(KEYS.categories, SEED_CATEGORIES)));
  const [products, setProducts] = useState(() => (IS_CONNECTED ? [] : readLocal(KEYS.products, SEED_PRODUCTS)));
  const [orders, setOrders] = useState(() => (IS_CONNECTED ? [] : readLocal(KEYS.orders, SEED_ORDERS)));
  const [inventoryLogs, setInventoryLogs] = useState(() => (IS_CONNECTED ? [] : readLocal(KEYS.logs, SEED_INVENTORY_LOGS)));
  const [loading, setLoading] = useState(IS_CONNECTED);
  const [loadError, setLoadError] = useState(null);
  const [users, setUsers] = useState(() => (IS_CONNECTED ? [] : readLocal('syntratech_users', Object.values(DEMO_PROFILES))));
  const [paymentSettings, setPaymentSettings] = useState(() => {
    if (IS_CONNECTED) return EMPTY_PAYMENT_SETTINGS;
    try {
      const saved = JSON.parse(localStorage.getItem('syntratech_payment_settings') || 'null');
      return saved || DEMO_PAYMENT_SETTINGS;
    } catch {
      return DEMO_PAYMENT_SETTINGS;
    }
  });

  // Guardar cambios del modo demostración.
  useEffect(() => {
    if (IS_CONNECTED) return;
    writeLocal(KEYS.categories, categories);
    writeLocal(KEYS.products, products);
    writeLocal(KEYS.orders, orders);
    writeLocal(KEYS.logs, inventoryLogs);
    writeLocal('syntratech_users', users);
    try {
      localStorage.setItem('syntratech_payment_settings', JSON.stringify(paymentSettings));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [categories, products, orders, inventoryLogs, users, paymentSettings]);

  // ——— Carga desde Supabase ———
  const refresh = useCallback(async () => {
    if (!IS_CONNECTED) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [catRes, prodRes, payRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('payment_settings').select('*').eq('id', 1).maybeSingle(),
      ]);
      if (catRes.error) throw catRes.error;
      if (prodRes.error) throw prodRes.error;
      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
      // Si la migración 0006 aún no se ejecutó, la tabla no existe: queda solo contra entrega.
      setPaymentSettings(payRes.error || !payRes.data ? EMPTY_PAYMENT_SETTINGS : { ...EMPTY_PAYMENT_SETTINGS, ...payRes.data });
      const productNames = Object.fromEntries((prodRes.data || []).map((p) => [p.id, p.name]));

      // Perfiles: solo el administrador puede leer los de todos.
      let people = {};
      if (user && isAdmin) {
        const profRes = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (profRes.error) throw profRes.error;
        setUsers(profRes.data || []);
        people = Object.fromEntries((profRes.data || []).map((p) => [p.id, p]));
      } else {
        setUsers([]);
      }

      // Pedidos: las políticas RLS devuelven solo los propios (o todos si es admin).
      if (user && profile?.role !== 'proveedor') {
        const ordRes = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .order('created_at', { ascending: false });
        if (ordRes.error) throw ordRes.error;
        setOrders(
          (ordRes.data || []).map((o) => ({
            ...o,
            customer_name: o.user_id ? people[o.user_id]?.full_name || people[o.user_id]?.email : 'Usuario eliminado',
            customer_email: people[o.user_id]?.email,
            items: (o.items || []).map((i) => ({ ...i, name: productNames[i.product_id] || 'Producto retirado' })),
          }))
        );
      } else {
        setOrders([]);
      }

      if (user && isStaff) {
        const logRes = await supabase.from('inventory_logs').select('*').order('created_at', { ascending: false }).limit(300);
        if (logRes.error) throw logRes.error;
        setInventoryLogs(
          (logRes.data || []).map((l) => ({
            ...l,
            product_name: productNames[l.product_id] || l.product_id,
            changed_by_name:
              people[l.changed_by]?.full_name ||
              people[l.changed_by]?.email ||
              (l.changed_by === user.id ? profile?.full_name : null) ||
              'Sistema',
          }))
        );
      } else {
        setInventoryLogs([]);
      }
    } catch (err) {
      console.error('Error cargando datos de Supabase:', err);
      setLoadError(err.message || 'No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, [user, profile, isAdmin, isStaff]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ——— Inventario ———
  const adjustStock = async (productId, delta, changeType = 'ajuste', notes = '') => {
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error('Producto no encontrado');
    const newStock = product.stock + delta;
    if (newStock < 0) throw new Error(`El stock no puede ser negativo. Existencias actuales: ${product.stock}`);
    const note = notes || `Ajuste manual de stock (${delta > 0 ? '+' : ''}${delta})`;

    if (IS_CONNECTED) {
      const { error } = await supabase.rpc('adjust_stock', {
        p_product_id: productId,
        p_delta: delta,
        p_change_type: changeType,
        p_notes: note,
      });
      if (error && !isMissingRpc(error)) fail(error, 'No se pudo ajustar el stock');
      if (error) {
        const upd = await supabase.from('products').update({ stock: newStock }).eq('id', productId);
        if (upd.error) fail(upd.error, 'No se pudo ajustar el stock');
        await supabase.from('inventory_logs').insert({
          product_id: productId,
          changed_by: user?.id,
          change_type: changeType,
          quantity_change: delta,
          previous_stock: product.stock,
          new_stock: newStock,
          notes: note,
        });
      }
      await refresh();
      return { success: true, newStock };
    }

    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)));
    setInventoryLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        product_id: productId,
        product_name: product.name,
        changed_by_name: profile?.full_name || 'Sistema',
        change_type: changeType,
        quantity_change: delta,
        previous_stock: product.stock,
        new_stock: newStock,
        notes: note,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    return { success: true, newStock };
  };

  const addProduct = async (productData) => {
    const payload = {
      name: productData.name,
      slug: productData.slug,
      category_id: productData.category_id || null,
      description: productData.description || '',
      image_url: productData.image_url || '',
      price: Math.round(Number(productData.price) || 0),
      stock: Number(productData.stock) || 0,
      is_active: productData.is_active !== undefined ? productData.is_active : true,
    };

    if (IS_CONNECTED) {
      const { data, error } = await supabase.from('products').insert([payload]).select().single();
      if (error) fail(error, 'No se pudo crear el producto');
      if (data && payload.stock > 0) {
        await supabase.from('inventory_logs').insert({
          product_id: data.id,
          changed_by: user?.id,
          change_type: 'ingreso',
          quantity_change: payload.stock,
          previous_stock: 0,
          new_stock: payload.stock,
          notes: 'Stock inicial de alta de producto',
        });
      }
      await refresh();
      return data;
    }

    const newProduct = { id: `prod-${Date.now()}`, ...payload, created_at: new Date().toISOString() };
    setProducts((prev) => [newProduct, ...prev]);
    if (newProduct.stock > 0) {
      setInventoryLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          product_id: newProduct.id,
          product_name: newProduct.name,
          changed_by_name: profile?.full_name || 'Administrador',
          change_type: 'ingreso',
          quantity_change: newProduct.stock,
          previous_stock: 0,
          new_stock: newProduct.stock,
          notes: 'Stock inicial de alta de producto',
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    return newProduct;
  };

  // Edita datos del producto (no el stock: ese pasa por adjustStock para quedar auditado).
  const updateProduct = async (id, updates) => {
    const clean = { ...updates };
    delete clean.stock;
    if (clean.price !== undefined) clean.price = Math.round(Number(clean.price) || 0);
    if (clean.category_id === '') clean.category_id = null;
    if (IS_CONNECTED) {
      const { error } = await supabase.from('products').update(clean).eq('id', id);
      if (error) fail(error, 'No se pudo actualizar el producto');
      await refresh();
      return;
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...clean } : p)));
  };

  // Devuelve 'deleted' o 'deactivated' (si ya tiene ventas, se despublica en lugar de borrarse).
  const deleteProduct = async (id) => {
    if (IS_CONNECTED) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        const off = await supabase.from('products').update({ is_active: false }).eq('id', id);
        if (off.error) fail(error, 'No se pudo eliminar el producto');
        await refresh();
        return 'deactivated';
      }
      await refresh();
      return 'deleted';
    }
    const hasSales = orders.some((o) => (o.items || []).some((i) => i.product_id === id));
    if (hasSales) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: false } : p)));
      return 'deactivated';
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    return 'deleted';
  };

  // ——— Categorías (solo administrador) ———
  const addCategory = async ({ name, description }) => {
    if (!isAdmin) throw new Error('Solo un administrador puede crear categorías.');
    const payload = { name: name.trim(), slug: slugify(name), description: description?.trim() || null };
    if (!payload.name) throw new Error('El nombre de la categoría es obligatorio.');
    if (IS_CONNECTED) {
      const { error } = await supabase.from('categories').insert([payload]);
      if (error) fail(error, 'No se pudo crear la categoría');
      await refresh();
      return;
    }
    setCategories((prev) => [...prev, { id: `cat-${Date.now()}`, ...payload }]);
  };

  const updateCategory = async (id, { name, description }) => {
    if (!isAdmin) throw new Error('Solo un administrador puede editar categorías.');
    const payload = { name: name.trim(), slug: slugify(name), description: description?.trim() || null };
    if (!payload.name) throw new Error('El nombre de la categoría es obligatorio.');
    if (IS_CONNECTED) {
      const { error } = await supabase.from('categories').update(payload).eq('id', id);
      if (error) fail(error, 'No se pudo actualizar la categoría');
      await refresh();
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...payload } : c)));
  };

  // Los productos de una categoría borrada quedan como "General".
  const deleteCategory = async (id) => {
    if (!isAdmin) throw new Error('Solo un administrador puede eliminar categorías.');
    if (IS_CONNECTED) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) fail(error, 'No se pudo eliminar la categoría');
      await refresh();
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setProducts((prev) => prev.map((p) => (p.category_id === id ? { ...p, category_id: null } : p)));
  };

  // ——— Pedidos ———
  const placeOrder = async (shippingInfo, cartItems) => {
    if (!user) throw new Error('Debes iniciar sesión para confirmar el pedido.');

    for (const item of cartItems) {
      const prod = products.find((p) => p.id === item.id);
      if (!prod || prod.stock < item.quantity) {
        throw new Error(`Stock insuficiente para "${item.name}". Disponibles: ${prod ? prod.stock : 0}`);
      }
    }

    const paymentMethod = shippingInfo.paymentMethod || 'contra_entrega';
    const trackingNumber = `SYN-${Math.floor(100000 + Math.random() * 900000)}`;
    // Se usan los precios actuales del catálogo, no los guardados en el carrito.
    const subtotal = cartItems.reduce((sum, i) => {
      const prod = products.find((p) => p.id === i.id);
      return sum + Number(prod?.price ?? i.price) * i.quantity;
    }, 0);
    const shipping = shippingCost(subtotal);
    const totalAmount = subtotal + shipping;

    if (IS_CONNECTED) {
      const { data, error } = await supabase.rpc('place_order', {
        p_items: cartItems.map((i) => ({ product_id: i.id, quantity: i.quantity })),
        p_shipping_address: shippingInfo.address,
        p_shipping_city: shippingInfo.city,
        p_shipping_phone: shippingInfo.phone,
        p_payment_method: paymentMethod,
        p_notes: shippingInfo.notes || '',
        p_tracking_number: trackingNumber,
      });
      if (error) {
        if (isMissingRpc(error)) {
          throw new Error('La base de datos aún no tiene la función de pedidos. Ejecuta supabase/migrations/0001_esquema_completo.sql en Supabase.');
        }
        fail(error, 'No se pudo registrar el pedido');
      }
      await refresh();
      const orderId = typeof data === 'object' && data !== null ? data.id || data : data;
      return {
        id: orderId,
        tracking_number: trackingNumber,
        shipping_address: shippingInfo.address,
        shipping_city: shippingInfo.city,
        total_amount: totalAmount,
        payment_method: paymentMethod,
      };
    }

    const order = {
      id: `ord-${Date.now()}`,
      user_id: user.id,
      customer_name: profile?.full_name || user.email,
      total_amount: totalAmount,
      shipping_cost: shipping,
      status: 'pendiente',
      shipping_address: shippingInfo.address,
      shipping_city: shippingInfo.city,
      shipping_phone: shippingInfo.phone,
      payment_method: paymentMethod,
      // Todo pedido nace con pago pendiente: lo confirma el admin o Wompi.
      payment_status: 'pendiente',
      tracking_number: trackingNumber,
      notes: shippingInfo.notes || '',
      created_at: new Date().toISOString(),
      items: cartItems.map((i) => ({
        product_id: i.id,
        name: i.name,
        quantity: i.quantity,
        unit_price: Number(products.find((p) => p.id === i.id)?.price ?? i.price),
      })),
    };

    const now = Date.now();
    const newLogs = cartItems.map((item, idx) => {
      const prevStock = products.find((p) => p.id === item.id)?.stock ?? item.quantity;
      return {
        id: `log-${now}-${idx}`,
        product_id: item.id,
        product_name: item.name,
        changed_by_name: profile?.full_name || 'Cliente',
        change_type: 'venta',
        quantity_change: -item.quantity,
        previous_stock: prevStock,
        new_stock: prevStock - item.quantity,
        notes: `Pedido #${order.id}`,
        created_at: new Date().toISOString(),
      };
    });

    setInventoryLogs((prev) => [...newLogs, ...prev]);
    setProducts((prev) =>
      prev.map((p) => {
        const ci = cartItems.find((i) => i.id === p.id);
        return ci ? { ...p, stock: p.stock - ci.quantity } : p;
      })
    );
    setOrders((prev) => [order, ...prev]);
    return order;
  };

  // Campos del pedido que el administrador puede modificar.
  const EDITABLE_ORDER_FIELDS = ['status', 'tracking_number', 'payment_status', 'shipping_address', 'shipping_city', 'shipping_phone', 'notes'];

  const updateOrder = async (orderId, changes) => {
    const current = orders.find((o) => o.id === orderId);
    const updates = Object.fromEntries(Object.entries(changes).filter(([k, v]) => EDITABLE_ORDER_FIELDS.includes(k) && v !== undefined));
    const status = updates.status;

    // Un pedido cancelado ya devolvió su stock: reabrirlo descuadraría el inventario.
    if (current?.status === 'cancelado' && status && status !== 'cancelado') {
      throw new Error('Un pedido cancelado no se puede reabrir. Crea un pedido nuevo.');
    }

    if (IS_CONNECTED) {
      if (status === 'cancelado' && current?.status !== 'cancelado') {
        const { error } = await supabase.rpc('cancel_order', { p_order_id: orderId });
        if (error) fail(error, 'No se pudo cancelar el pedido');
        delete updates.status;
      }
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
        if (error) fail(error, 'No se pudo actualizar el pedido');
      }
      await refresh();
      return;
    }

    // Al cancelar, se devuelven las unidades al inventario.
    if (status === 'cancelado' && current && current.status !== 'cancelado') {
      if (current.payment_status === 'pagado') updates.payment_status = 'reembolsado';
      const items = current.items || [];
      setProducts((prev) =>
        prev.map((p) => {
          const it = items.find((i) => i.product_id === p.id);
          return it ? { ...p, stock: p.stock + it.quantity } : p;
        })
      );
      setInventoryLogs((prev) => [
        ...items.map((it, idx) => {
          const prevStock = products.find((p) => p.id === it.product_id)?.stock ?? 0;
          return {
            id: `log-${Date.now()}-c${idx}`,
            product_id: it.product_id,
            product_name: it.name,
            changed_by_name: profile?.full_name || 'Sistema',
            change_type: 'devolucion',
            quantity_change: it.quantity,
            previous_stock: prevStock,
            new_stock: prevStock + it.quantity,
            notes: `Cancelación pedido #${orderId}`,
            created_at: new Date().toISOString(),
          };
        }),
        ...prev,
      ]);
    }
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o)));
  };

  const updateOrderStatus = (orderId, status, trackingNumber) =>
    updateOrder(orderId, { status, tracking_number: trackingNumber });

  // Borra el pedido del historial. Si no estaba cancelado, primero se cancela para devolver el stock.
  const deleteOrder = async (orderId) => {
    if (!isAdmin) throw new Error('Solo un administrador puede eliminar pedidos.');
    const current = orders.find((o) => o.id === orderId);
    if (current && current.status !== 'cancelado') await updateOrder(orderId, { status: 'cancelado' });
    if (IS_CONNECTED) {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) fail(error, 'No se pudo eliminar el pedido');
      await refresh();
      return;
    }
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  // ——— Pagos ———
  const PAYMENT_FIELDS = Object.keys(EMPTY_PAYMENT_SETTINGS);

  const updatePaymentSettings = async (changes) => {
    if (!isAdmin) throw new Error('Solo un administrador puede cambiar los datos de pago.');
    const clean = Object.fromEntries(
      Object.entries(changes)
        .filter(([k]) => PAYMENT_FIELDS.includes(k))
        .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    );
    if (clean.wompi_llave_publica && !/^pub_(test|prod)_/.test(clean.wompi_llave_publica)) {
      throw new Error('La llave pública de Wompi empieza por pub_test_ (pruebas) o pub_prod_ (producción).');
    }
    if (IS_CONNECTED) {
      const { error } = await supabase.from('payment_settings').update(clean).eq('id', 1);
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          throw new Error('Falta ejecutar supabase/migrations/0006_medios_de_pago.sql en Supabase (SQL Editor).');
        }
        fail(error, 'No se pudieron guardar los datos de pago');
      }
      await refresh();
      return;
    }
    setPaymentSettings((prev) => ({ ...prev, ...clean }));
  };

  // El cliente escribe el número de comprobante de su transferencia (Nequi, Bancolombia, Nu).
  const submitPaymentReference = async (orderId, reference) => {
    const ref = String(reference || '').trim();
    if (!ref) throw new Error('Escribe el número de comprobante.');
    if (IS_CONNECTED) {
      const { error } = await supabase.rpc('submit_payment_reference', { p_order_id: orderId, p_reference: ref });
      if (error) {
        if (isMissingRpc(error)) throw new Error('Falta ejecutar supabase/migrations/0006_medios_de_pago.sql en Supabase.');
        fail(error, 'No se pudo guardar el comprobante');
      }
      await refresh();
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, payment_reference: ref } : o)));
  };

  // Abre la pasarela Wompi para un pedido. Devuelve la transacción informada por el widget.
  const payWithWompi = async (order, customer) => {
    if (!IS_CONNECTED) throw new Error('El pago en línea con Wompi no funciona en modo demostración.');
    if (!paymentSettings.wompi_activo || !paymentSettings.wompi_llave_publica) {
      throw new Error('El pago en línea aún no está activado en esta tienda.');
    }
    const { data, error } = await supabase.functions.invoke('wompi-firma', { body: { order_id: order.id } });
    if (error || !data?.integrity) {
      let msg = data?.error;
      try {
        msg = msg || (await error?.context?.json())?.error;
      } catch {
        /* sin cuerpo */
      }
      throw new Error(msg || 'No se pudo iniciar el pago en línea. Verifica que la función wompi-firma esté desplegada.');
    }
    const tx = await openWompiCheckout({ publicKey: paymentSettings.wompi_llave_publica, signed: data, customer });
    // El webhook confirma el pago en segundo plano; se recarga un momento después.
    setTimeout(() => refresh(), 4000);
    return tx;
  };

  // ——— Usuarios (solo administrador) ———
  const createUser = async ({ email, password, fullName, role, phone, city, address }) => {
    if (!isAdmin) throw new Error('Solo un administrador puede crear usuarios.');
    if (IS_CONNECTED) {
      const { data, error } = await supabase.rpc('admin_create_user', {
        p_email: email,
        p_password: password,
        p_full_name: fullName,
        p_role: role,
        p_phone: phone || null,
        p_city: city || null,
        p_address: address || null,
      });
      if (error) {
        if (isMissingRpc(error)) {
          throw new Error('Falta ejecutar supabase/migrations/0003_gestion_usuarios.sql en Supabase.');
        }
        fail(error, 'No se pudo crear el usuario');
      }
      await refresh();
      return data;
    }
    const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) throw new Error(`Ya existe una cuenta con el correo ${email}`);
    const newUser = {
      id: `user-${Date.now()}`,
      email: email.toLowerCase(),
      full_name: fullName,
      role,
      phone,
      city,
      address,
      created_at: new Date().toISOString(),
    };
    setUsers((prev) => [newUser, ...prev]);
    return newUser.id;
  };

  const setUserRole = async (userId, role) => {
    if (!isAdmin) throw new Error('Solo un administrador puede cambiar roles.');
    if (userId === user?.id) throw new Error('No puedes cambiar tu propio rol.');
    if (IS_CONNECTED) {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
      if (error) fail(error, 'No se pudo cambiar el rol');
      await refresh();
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
  };

  const updateUser = async (userId, { fullName, phone, city, address, role }) => {
    if (!isAdmin) throw new Error('Solo un administrador puede editar usuarios.');
    if (!fullName?.trim()) throw new Error('El nombre completo es obligatorio.');
    if (userId === user?.id && role !== 'admin') throw new Error('No puedes quitarte el rol de administrador.');
    if (IS_CONNECTED) {
      const { error } = await supabase.rpc('admin_update_user', {
        p_user_id: userId,
        p_full_name: fullName,
        p_phone: phone || '',
        p_city: city || '',
        p_address: address || '',
        p_role: role,
      });
      if (error) {
        if (isMissingRpc(error)) throw new Error(MIGRATION_0004);
        fail(error, 'No se pudo actualizar el usuario');
      }
      await refresh();
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, full_name: fullName.trim(), phone, city, address, role } : u))
    );
  };

  const deleteUser = async (userId) => {
    if (!isAdmin) throw new Error('Solo un administrador puede eliminar usuarios.');
    if (userId === user?.id) throw new Error('No puedes eliminar tu propia cuenta.');
    const target = users.find((u) => u.id === userId);
    if (target?.role === 'admin' && users.filter((u) => u.role === 'admin').length <= 1) {
      throw new Error('No se puede eliminar al único administrador.');
    }
    if (IS_CONNECTED) {
      const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
      if (error) {
        if (isMissingRpc(error)) throw new Error(MIGRATION_0004);
        fail(error, 'No se pudo eliminar el usuario');
      }
      await refresh();
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setOrders((prev) => prev.map((o) => (o.user_id === userId ? { ...o, user_id: null, customer_name: 'Usuario eliminado' } : o)));
  };

  const setUserPassword = async (userId, password) => {
    if (!isAdmin) throw new Error('Solo un administrador puede cambiar contraseñas.');
    if (!password || password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
    if (IS_CONNECTED) {
      const { error } = await supabase.rpc('admin_set_password', { p_user_id: userId, p_password: password });
      if (error) {
        if (isMissingRpc(error)) throw new Error(MIGRATION_0004);
        fail(error, 'No se pudo cambiar la contraseña');
      }
      return;
    }
    // En modo demostración no hay contraseñas reales.
  };

  return (
    <StoreContext.Provider
      value={{
        categories,
        products,
        orders,
        inventoryLogs,
        loading,
        loadError,
        refresh,
        users,
        createUser,
        setUserRole,
        updateUser,
        deleteUser,
        setUserPassword,
        adjustStock,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        placeOrder,
        updateOrder,
        updateOrderStatus,
        deleteOrder,
        paymentSettings,
        updatePaymentSettings,
        submitPaymentReference,
        payWithWompi,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe ser utilizado dentro de StoreProvider');
  return ctx;
}
