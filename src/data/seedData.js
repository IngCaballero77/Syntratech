import { CATALOG_CATEGORIES, CATALOG_PRODUCTS } from './catalogoAmpliado';

const BASE_CATEGORIES = [
  {
    id: 'cat-1',
    name: 'Limpiadores generales',
    slug: 'limpiadores-generales',
    description: 'Multiusos, desinfectantes, limpiavidrios y limpiapisos para todo el hogar.',
    icon: 'Sparkles',
  },
  {
    id: 'cat-2',
    name: 'Lavaplatos y cocina',
    slug: 'lavaplatos-y-cocina',
    description: 'Desengrasantes de alta potencia, lavavajillas y limpiadores de acero.',
    icon: 'UtensilsCrossed',
  },
  {
    id: 'cat-3',
    name: 'Ropa y lavandería',
    slug: 'ropa-y-lavanderia',
    description: 'Detergentes líquidos concentrados, suavizantes y blanqueadores seguros.',
    icon: 'Shirt',
  },
  {
    id: 'cat-4',
    name: 'Baño y sanitarios',
    slug: 'bano-y-sanitarios',
    description: 'Desincrustantes antisarro, geles bactericidas y limpiadores de juntas.',
    icon: 'Bath',
  },
  {
    id: 'cat-5',
    name: 'Accesorios de limpieza',
    slug: 'accesorios-de-limpieza',
    description: 'Traperos 360°, paños de microfibra, baldes con escurridor y guantes.',
    icon: 'Wrench',
  },
];

const BASE_PRODUCTS = [
  {
    id: 'prod-1',
    category_id: 'cat-3',
    name: 'Detergente Líquido Concentrado Lavandería (3 Litros)',
    slug: 'detergente-liquido-concentrado-lavanderia-3l',
    description:
      'Fórmula biodegradable de alto rendimiento para ropa blanca y de color. Protege fibras textiles y remueve manchas profundas.',
    price: 42900,
    stock: 45,
    image_url:
      'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=800&q=80',
    is_active: true,
  },
  {
    id: 'prod-2',
    category_id: 'cat-2',
    name: 'Desengrasante Multiusos Cítrico Biodegradable (1 Litro)',
    slug: 'desengrasante-multiusos-citrico-1l',
    description:
      'Poderoso desengrasante formulado con aceites cítricos naturales para campanas, estufas, hornos y mesones sin vapores tóxicos.',
    price: 17900,
    stock: 60,
    image_url:
      'https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?auto=format&fit=crop&w=800&q=80',
    is_active: true,
  },
  {
    id: 'prod-3',
    category_id: 'cat-2',
    name: 'Jabón Lavaplatos Líquido con Aloe y Bicarbonato (750 ml)',
    slug: 'jabon-lavaplatos-aloe-bicarbonato-750ml',
    description:
      'Acción corta-grasa instantánea. Delicado con tus manos gracias al extracto de aloe vera y neutralizador de olores.',
    price: 12900,
    stock: 50,
    image_url:
      'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=800&q=80',
    is_active: true,
  },
  {
    id: 'prod-4',
    category_id: 'cat-1',
    name: 'Limpiador Desinfectante de Pisos Aroma Lavanda Silvestre (2 Litros)',
    slug: 'limpiador-pisos-lavanda-2l',
    description:
      'Elimina el 99.9% de bacterias y hongos. Aporta brillo duradero y fragancia relajante sin necesidad de enjuagar.',
    price: 19900,
    stock: 35,
    image_url:
      'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=800&q=80',
    is_active: true,
  },
  {
    id: 'prod-5',
    category_id: 'cat-4',
    name: 'Gel Antisarro y Desincrustante Sanitario Activo (1 Litro)',
    slug: 'gel-antisarro-desincrustante-1l',
    description:
      'Adherencia prolongada que descompone sarro, sales minerales y óxido en inodoros, griferías y azulejos.',
    price: 15900,
    stock: 28,
    image_url:
      'https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?auto=format&fit=crop&w=800&q=80',
    is_active: true,
  },
  {
    id: 'prod-6',
    category_id: 'cat-5',
    name: 'Kit Pro: Trapero Microfibra 360° + Balde Escurridor + Guantes',
    slug: 'kit-pro-trapero-microfibra-balde-guantes',
    description:
      'Set completo ergonómico para aseo profundo. Balde con canasta centrífuga, mopa giratoria y guantes de alta resistencia.',
    price: 89900,
    stock: 20,
    image_url:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    is_active: true,
  },
];

export const SEED_ORDERS = [
  {
    id: 'ord-1001',
    user_id: 'user-cliente-1',
    total_amount: 92700,
    shipping_cost: 12000,
    status: 'enviado',
    shipping_address: 'Calle 45 # 12 - 34, Apto 502',
    shipping_city: 'Bogotá',
    shipping_phone: '+57 310 987 6543',
    payment_method: 'contra_entrega',
    payment_status: 'pendiente',
    tracking_number: 'SYN-COL-982143',
    notes: 'Entregar en conserjería',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    items: [
      { product_id: 'prod-1', name: 'Detergente Líquido Concentrado Lavandería (3 Litros)', quantity: 1, unit_price: 42900 },
      { product_id: 'prod-2', name: 'Desengrasante Multiusos Cítrico Biodegradable (1 Litro)', quantity: 1, unit_price: 17900 },
      { product_id: 'prod-4', name: 'Limpiador Desinfectante de Pisos Aroma Lavanda Silvestre (2 Litros)', quantity: 1, unit_price: 19900 },
    ],
  },
  {
    id: 'ord-1002',
    user_id: 'user-cliente-1',
    total_amount: 101900,
    shipping_cost: 12000,
    status: 'procesando',
    shipping_address: 'Carrera 7 # 71 - 21',
    shipping_city: 'Medellín',
    shipping_phone: '+57 300 123 4567',
    payment_method: 'tarjeta',
    payment_status: 'pagado',
    tracking_number: 'SYN-COL-982144',
    notes: 'Llamar antes de entregar',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    items: [
      { product_id: 'prod-6', name: 'Kit Pro: Trapero Microfibra 360° + Balde Escurridor + Guantes', quantity: 1, unit_price: 89900 },
    ],
  },
];

export const SEED_INVENTORY_LOGS = [
  {
    id: 'log-1',
    product_id: 'prod-1',
    product_name: 'Detergente Líquido Concentrado Lavandería (3 Litros)',
    changed_by_name: 'Administrador General',
    change_type: 'ingreso',
    quantity_change: 50,
    previous_stock: 0,
    new_stock: 50,
    notes: 'Lote de producción inicial planta Syntratech',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'log-2',
    product_id: 'prod-1',
    product_name: 'Detergente Líquido Concentrado Lavandería (3 Litros)',
    changed_by_name: 'Proveedor Químicos Andinos',
    change_type: 'venta',
    quantity_change: -5,
    previous_stock: 50,
    new_stock: 45,
    notes: 'Despacho de pedidos comunitarios',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const DEMO_PROFILES = {
  admin: {
    id: 'user-admin-1',
    email: 'admin@syntratech.com',
    full_name: 'Administrador Syntratech',
    role: 'admin',
    phone: '+57 300 000 0001',
    address: 'Sede Principal Syntratech, Suite 101',
    city: 'Bogotá',
  },
  proveedor: {
    id: 'user-proveedor-1',
    email: 'proveedor@syntratech.com',
    full_name: 'Proveedor Químicos Andinos',
    role: 'proveedor',
    phone: '+57 300 000 0002',
    address: 'Centro de Distribución Bodega 4',
    city: 'Medellín',
  },
  cliente: {
    id: 'user-cliente-1',
    email: 'cliente@comunidad.org',
    full_name: 'Carlos Mendoza',
    role: 'cliente',
    phone: '+57 310 987 6543',
    address: 'Calle 45 # 12 - 34, Apto 502',
    city: 'Bogotá',
  },
};

// Catálogo ampliado (ver src/data/catalogoAmpliado.js).
export const SEED_CATEGORIES = [
  ...BASE_CATEGORIES,
  ...Object.values(CATALOG_CATEGORIES)
    .filter((c) => c.name)
    .map((c) => ({ id: c.demo, name: c.name, slug: c.slug, description: c.description, icon: c.icon })),
];

export const SEED_PRODUCTS = [
  ...BASE_PRODUCTS,
  ...CATALOG_PRODUCTS.map((p) => ({
    id: p.demoId,
    category_id: CATALOG_CATEGORIES[p.category].demo,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    stock: p.stock,
    image_url: p.image_url,
    is_active: true,
  })),
];
