// Catálogo ampliado de aseo y limpieza (noviembre 2026).
//
// Nombres, presentaciones y precios de referencia tomados de lo que venden
// supermercados colombianos: exito.com (sección Aseo del hogar) y marcas propias
// de Tiendas D1 (Brilla King, Bonaropa) y Tiendas Ara (Agente X, Scoffy) según
// notas de prensa. Los precios marcados con `aprox: true` son estimados.
// Revisa y ajusta los precios desde el panel antes de vender.
//
// Las imágenes son fotos de uso libre de Unsplash (licencia Unsplash), NO fotos de
// los supermercados ni de las marcas: esas tienen derechos de autor.
//
// Este archivo alimenta:
//   - el modo demostración (src/data/seedData.js)
//   - el script SQL para Supabase: `node scripts/generar-sql-catalogo.mjs`

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

// Fotos por tipo de producto.
const IMG = {
  detergente: img('photo-1585421514284-efb74c2b69ba'),
  suavizante: img('photo-1764242191304-9bafa618c3c4'),
  botellas: img('photo-1650964336602-f60274c5a94d'),
  lavadora: img('photo-1611878821586-eb39c951c236'),
  jabonBarra: img('photo-1571134870096-90431a680fa9'),
  lavaplatos: img('photo-1585421514738-01798e348b17'),
  cepilloLoza: img('photo-1765516469361-f4bd614fa926'),
  panos: img('photo-1716625300719-f0e932d090d9'),
  spray: img('photo-1610389473058-fd68ad1d8bac'),
  sprayClaro: img('photo-1576503276236-71dd8ad5b0b9'),
  limpiadores: img('photo-1642683497911-f4c6d5cbd39b'),
  limpiadoresTrio: img('photo-1716625300720-b34970a2d890'),
  // (Se evita la foto con una botella de marca visible para no confundir marcas.)
  desinfectante: img('photo-1716625300720-b34970a2d890'),
  pisos: img('photo-1563453392212-326f5e854473'),
  bano: img('photo-1651415223860-1a4bf68510c4'),
  papel: img('photo-1584743579083-b331c4adbb15'),
  papelCanasta: img('photo-1704185677476-e89af4861435'),
  escobas: img('photo-1791116942375-cbd39609c982'),
  tiendaAseo: img('photo-1771721194354-1459521d58c9'),
  kitTrapero: img('photo-1581578731548-c64695cc6952'),
};

// Categorías: id en Supabase y id en el modo demostración.
export const CATALOG_CATEGORIES = {
  generales: { db: '11111111-1111-1111-1111-111111111101', demo: 'cat-1' },
  cocina: { db: '11111111-1111-1111-1111-111111111102', demo: 'cat-2' },
  ropa: { db: '11111111-1111-1111-1111-111111111103', demo: 'cat-3' },
  bano: { db: '11111111-1111-1111-1111-111111111104', demo: 'cat-4' },
  accesorios: { db: '11111111-1111-1111-1111-111111111105', demo: 'cat-5' },
  papel: {
    db: '11111111-1111-1111-1111-111111111106',
    demo: 'cat-6',
    name: 'Papel y desechables',
    slug: 'papel-y-desechables',
    description: 'Papel higiénico, toallas de cocina, servilletas y bolsas para basura.',
    icon: 'ScrollText',
  },
  plagas: {
    db: '11111111-1111-1111-1111-111111111107',
    demo: 'cat-7',
    name: 'Control de plagas',
    slug: 'control-de-plagas',
    description: 'Insecticidas y geles para cucarachas, hormigas y zancudos.',
    icon: 'Bug',
  },
};

// [categoría, nombre, precio COP, imagen, descripción, aprox?]
const RAW = [
  // ——— Ropa y lavandería ———
  ['ropa', 'Detergente en Polvo Ariel Triple Poder (2 kg)', 36400, IMG.detergente, 'Detergente en polvo de alto rendimiento para ropa blanca y de color. Remueve manchas difíciles desde el primer lavado.'],
  ['ropa', 'Detergente en Polvo Ariel Triple Poder (5 kg)', 62300, IMG.detergente, 'Presentación familiar del detergente en polvo Ariel. Ideal para lavadora y lavado a mano.'],
  ['ropa', 'Detergente en Polvo FAB Ultra Flash (4 kg)', 49400, IMG.detergente, 'Limpieza profunda y aroma duradero. Rinde para muchas cargas de ropa.'],
  ['ropa', 'Detergente Líquido FAB Ultra Flash (1,8 L)', 34000, IMG.botellas, 'Detergente líquido que se disuelve rápido y no deja residuos en las prendas.'],
  ['ropa', 'Detergente Líquido Ariel Limpieza Profunda (1,8 L)', 44300, IMG.botellas, 'Fórmula líquida concentrada que cuida los colores y elimina malos olores.'],
  ['ropa', 'Detergente Líquido Ariel Limpieza Profunda (3,7 L)', 96700, IMG.botellas, 'Presentación grande del detergente líquido Ariel para hogares con mucha ropa.'],
  ['ropa', 'Detergente Líquido Blancox Protección Color (3,8 L)', 45800, IMG.botellas, 'Limpia a fondo y protege los colores de la ropa lavado tras lavado.'],
  ['ropa', 'Detergente en Polvo Dersa Doble Poder Multiusos (6 kg)', 62700, IMG.detergente, 'Detergente multiusos para ropa y limpieza general del hogar. Gran rendimiento.'],
  ['ropa', 'Detergente en Polvo Ekono Multiusos Aroma Floral (2,8 kg)', 10900, IMG.detergente, 'Opción económica de marca propia con aroma floral, para ropa y superficies.'],
  ['ropa', 'Detergente Líquido Woolite Protección y Cuidado (3,78 L)', 71600, IMG.botellas, 'Cuidado especial para prendas delicadas y oscuras. Evita el desgaste de las fibras.'],
  ['ropa', 'Detergente Líquido Aroma Floral Marca Propia Éxito (3 L)', 13900, IMG.botellas, 'Detergente líquido económico con aroma floral para el lavado diario.'],
  ['ropa', 'Detergente Líquido para Ropa Bonaropa (marca D1)', 13000, IMG.botellas, 'Detergente líquido de la marca propia de Tiendas D1. Buen rendimiento a bajo precio.', true],
  ['ropa', 'Detergente en Polvo Bonaropa (marca D1)', 19000, IMG.detergente, 'Detergente en polvo de la marca propia de Tiendas D1 para lavadora y a mano.', true],
  ['ropa', 'Cápsulas para Lavadora x20 Unidades', 18000, IMG.lavadora, 'Cápsulas monodosis: una por carga, sin medir ni derramar.', true],
  ['ropa', 'Jabón en Barra Rey Original (3 x 300 g)', 9700, IMG.jabonBarra, 'El clásico jabón en barra para lavar a mano. Quita mugre de cuellos y puños.'],
  ['ropa', 'Jabón en Barra Rey Azul (300 g)', 3300, IMG.jabonBarra, 'Jabón azul en barra para prendas blancas y lavado a mano.'],
  ['ropa', 'Jabón Líquido Rey Original (2 L)', 22300, IMG.botellas, 'La fórmula del jabón Rey en versión líquida, lista para lavadora.'],
  ['ropa', 'Suavizante Aromatel Floral (2,5 L)', 17600, IMG.suavizante, 'Deja la ropa suave y perfumada. Facilita el planchado.'],
  ['ropa', 'Suavizante Aromatel Fragancia Floral (5 L)', 46300, IMG.suavizante, 'Presentación grande del suavizante Aromatel para uso familiar.'],
  ['ropa', 'Suavizante Suavitel Fresca Primavera (2 L)', 16900, IMG.suavizante, 'Suavizante con fragancia fresca de larga duración.'],
  ['ropa', 'Suavizante Downy Adorable (450 ml)', 17700, IMG.suavizante, 'Suavizante concentrado: poca cantidad rinde muchas cargas.'],
  ['ropa', 'Suavizante Aroma Floral Marca Propia Éxito (3 L)', 9400, IMG.suavizante, 'Suavizante económico con aroma floral para toda la familia.'],
  ['ropa', 'Blanqueador Clorox Original (3,8 L)', 19700, IMG.desinfectante, 'Blanquea la ropa y desinfecta superficies. Úsalo diluido según la etiqueta.'],

  // ——— Lavaplatos y cocina ———
  ['cocina', 'Lavaplatos Líquido Axion Limón (1,5 L)', 18900, IMG.lavaplatos, 'Lavaplatos líquido con poder antigrasa y aroma a limón.'],
  ['cocina', 'Lavaplatos en Crema Axion Limón (900 g)', 13400, IMG.lavaplatos, 'Crema lavaloza que corta la grasa y rinde muchas lavadas.'],
  ['cocina', 'Lavaloza Axion Explosión Cítrica Doypack (1,5 L)', 12900, IMG.lavaplatos, 'Repuesto en bolsa doypack: usa menos plástico y rellena tu dispensador.'],
  ['cocina', 'Lavaloza Dersa Poder Antigrasa Limón (4 L)', 37200, IMG.lavaplatos, 'Galón de lavaloza para cocinas con mucho uso o negocios.'],
  ['cocina', 'Lavaloza Ekono Líquido Aroma Limón (500 ml)', 2600, IMG.lavaplatos, 'Lavaloza líquido económico de marca propia.'],
  ['cocina', 'Lavaloza Ekono en Crema Aroma Limón (1 kg)', 5400, IMG.lavaplatos, 'Crema lavaloza económica en presentación de 1 kg.'],
  ['cocina', 'Crema Lavaloza Brilla King (marca D1)', 2500, IMG.lavaplatos, 'Crema lavaloza de la marca propia de Tiendas D1.', true],
  ['cocina', 'Lavaloza Líquido Brilla King (marca D1)', 2700, IMG.lavaplatos, 'Lavaloza líquido de la marca propia de Tiendas D1.', true],
  ['cocina', 'Desengrasante Brilla King (500 ml, marca D1)', 2500, IMG.spray, 'Desengrasante para estufas, campanas y mesones. Marca propia de Tiendas D1.', true],
  ['cocina', 'Lavaloza Líquido Agente X (marca Ara)', 4500, IMG.lavaplatos, 'Lavaloza de Agente X, la marca propia de aseo de Tiendas Ara.', true],
  ['cocina', 'Esponja Eterna Doble Uso Máxima Duración (2 und)', 5600, IMG.panos, 'Esponja con cara suave y cara abrasiva para ollas y loza.'],
  ['cocina', 'Cepillo para Loza con Mango', 6900, IMG.cepilloLoza, 'Cepillo de cerdas firmes para ollas, botellas y loza.', true],

  // ——— Limpiadores generales ———
  ['generales', 'Limpiador Fabuloso Ultra Desinfectante (2 L)', 19300, IMG.pisos, 'Limpia y desinfecta pisos y superficies con aroma duradero.'],
  ['generales', 'Limpiapisos Fabuloso Alternativa al Cloro Fresca Lavanda (1,5 L)', 13100, IMG.pisos, 'Desinfecta sin cloro y deja un aroma fresco a lavanda.'],
  ['generales', 'Limpiador Fabuloso Energía Naranja (1 L)', 9800, IMG.pisos, 'Limpiador multiusos con aroma cítrico para todo el hogar.'],
  ['generales', 'Limpiapisos Fabuloso Antibacterial Lavanda (2 L)', 13500, IMG.pisos, 'Acción antibacterial para pisos de cerámica, porcelanato y baldosa.'],
  ['generales', 'Limpiapisos Fabuloso Antibacterial Lavanda (5 L)', 34600, IMG.pisos, 'Galón de limpiapisos antibacterial para uso intensivo.'],
  ['generales', 'Limpiapisos Todos los Días Lavanda (2 L)', 4200, IMG.pisos, 'Limpiapisos económico con aroma a lavanda.'],
  ['generales', 'Limpiapisos con Bicarbonato (3,78 L)', 12000, IMG.limpiadores, 'Limpiapisos con bicarbonato que ayuda a neutralizar olores.'],
  ['generales', 'Blanqueador Ekono Pureza Cítrica (2 L)', 3100, IMG.desinfectante, 'Blanqueador desinfectante económico con aroma cítrico.'],
  ['generales', 'Blanqueador Clorox Pack Limpia y Desinfecta (2,26 L)', 8200, IMG.desinfectante, 'Elimina gérmenes en pisos, baños y cocinas.'],
  ['generales', 'Blanqueador Blancox Desinfectante Poder Natural (3,8 L)', 10300, IMG.desinfectante, 'Blanqueador desinfectante en galón para todo el hogar.'],
  ['generales', 'Desinfectante Multiusos Scoffy (marca Ara)', 5900, IMG.sprayClaro, 'Desinfectante multiusos de Scoffy, marca de aseo de Tiendas Ara.', true],
  ['generales', 'Limpiador Multiusos Agente X (marca Ara)', 4900, IMG.limpiadoresTrio, 'Limpiador multiusos económico de la marca Agente X de Tiendas Ara.', true],
  ['generales', 'Limpiavidrios en Spray (500 ml)', 7900, IMG.sprayClaro, 'Deja vidrios y espejos sin manchas ni rayas.', true],

  // ——— Baño y sanitarios ———
  ['bano', 'Blanqueador Clorox Gel Original (1 L)', 7100, IMG.bano, 'Gel que se adhiere a las paredes del sanitario para desinfectar mejor.'],
  ['bano', 'Blanqueador Clorox Gel Lavanda (1 L)', 10700, IMG.bano, 'Gel desinfectante con aroma a lavanda para baños y cocinas.'],
  ['bano', 'Limpiador Desinfectante para Baño (marca D1)', 2900, IMG.bano, 'Limpiador económico para sanitarios, lavamanos y duchas.', true],
  ['bano', 'Pastillas Desinfectantes para Tanque de Sanitario (2 und)', 6500, IMG.bano, 'Limpian y perfuman con cada descarga.', true],
  ['bano', 'Cepillo para Sanitario con Base', 9900, IMG.bano, 'Cepillo de cerdas resistentes con base para guardar.', true],

  // ——— Accesorios de limpieza ———
  ['accesorios', 'Guantes Ekono Amarillos Talla 8 (1 par)', 2500, IMG.panos, 'Guantes de caucho para proteger las manos al lavar y limpiar.'],
  ['accesorios', 'Escoba de Cerdas Suaves con Palo', 12900, IMG.escobas, 'Escoba para pisos interiores, con palo roscado.', true],
  ['accesorios', 'Trapero de Algodón con Palo', 11900, IMG.tiendaAseo, 'Trapero absorbente de algodón para todo tipo de pisos.', true],
  ['accesorios', 'Recogedor con Mango Largo', 9900, IMG.tiendaAseo, 'Recoge la basura sin agacharte.', true],
  ['accesorios', 'Balde Plástico con Asa (12 L)', 10900, IMG.kitTrapero, 'Balde resistente para trapear y lavar.', true],
  ['accesorios', 'Paños de Microfibra Multiusos (3 und)', 8900, IMG.panos, 'Paños que atrapan el polvo y secan sin dejar pelusa.', true],
  ['accesorios', 'Ganchos para Ropa (10 und)', 11900, IMG.lavadora, 'Ganchos resistentes para colgar ropa al secar.'],

  // ——— Papel y desechables ———
  ['papel', 'Papel Higiénico Familia Expert 4 Hojas (12 rollos)', 26800, IMG.papel, 'Papel higiénico de cuatro hojas, suave y resistente.'],
  ['papel', 'Papel Higiénico Familia Acolchamax Megarrollo (12 rollos)', 22800, IMG.papel, 'Megarrollos acolchados que duran más.'],
  ['papel', 'Papel Higiénico Ekono Triple Hoja (396 m)', 14800, IMG.papelCanasta, 'Papel higiénico triple hoja de marca propia.'],
  ['papel', 'Papel Higiénico Ekono Triple Hoja (792 m)', 26900, IMG.papelCanasta, 'Paquete grande de papel higiénico triple hoja.'],
  ['papel', 'Papel Higiénico Scott Cuidado Completo (360 m)', 19000, IMG.papel, 'Papel higiénico suave y resistente.'],
  ['papel', 'Papel Higiénico Scott Cuidado Completo (540 m)', 28600, IMG.papel, 'Presentación familiar del papel Scott Cuidado Completo.'],
  ['papel', 'Papel Higiénico Scott 2 en 1 Jumbo 3 Hojas (12 rollos)', 15800, IMG.papelCanasta, 'Rollos jumbo de triple hoja.'],
  ['papel', 'Papel Higiénico Scott 2 en 1 Jumbo 3 Hojas (4 rollos)', 6200, IMG.papelCanasta, 'Paquete pequeño de rollos jumbo de triple hoja.'],
  ['papel', 'Toallas de Cocina Familia Green Triple Hoja (135 und)', 8100, IMG.papel, 'Toallas absorbentes para cocina, triple hoja.'],
  ['papel', 'Toallas de Cocina Familia Jumbo Practi Diarias (150 und)', 9700, IMG.papel, 'Rollo jumbo de toallas de cocina para el día a día.'],
  ['papel', 'Toallas de Cocina Ekono Desechables (50 und)', 1800, IMG.papel, 'Toallas de cocina económicas.'],
  ['papel', 'Toallas de Cocina Todos los Días (50 und)', 2200, IMG.papel, 'Toallas absorbentes color natural.'],
  ['papel', 'Servilletas Rosal Doble Hoja (100 und)', 3400, IMG.papel, 'Servilletas de doble hoja para la mesa.'],
  ['papel', 'Bolsas para Basura Tipo Apartamento 51x76 cm (Todos los Días)', 2100, IMG.tiendaAseo, 'Bolsas resistentes para canecas de cocina y baño.'],
  ['papel', 'Bolsas para Basura Tipo Residencia 65x80 cm (Todos los Días)', 2400, IMG.tiendaAseo, 'Bolsas grandes para canecas de patio o punto ecológico.'],

  // ——— Control de plagas ———
  ['plagas', 'Gel Insecticida Mata Cucarachas Gelfipron (11 g)', 16000, IMG.spray, 'Gel en jeringa: aplica gotas en rincones y grietas.'],
  ['plagas', 'Insecticida en Aerosol para Cucarachas (marca D1)', 7500, IMG.spray, 'Aerosol de acción rápida contra cucarachas y hormigas.', true],
  ['plagas', 'Insecticida en Aerosol para Zancudos y Moscas', 9900, IMG.spray, 'Aerosol contra insectos voladores para interiores.', true],
];

const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

// Existencias iniciales estables (no aleatorias) entre 15 y 120 unidades.
const stockFor = (i) => 15 + ((i * 37) % 106);

export const CATALOG_PRODUCTS = RAW.map(([cat, name, price, image_url, description, aprox], i) => ({
  n: i + 1,
  dbId: `33333333-3333-4333-8333-${String(i + 1).padStart(12, '0')}`,
  demoId: `prod-x${i + 1}`,
  category: cat,
  name,
  slug: slugify(name),
  description: aprox ? `${description} (Precio de referencia aproximado.)` : description,
  price,
  stock: stockFor(i + 1),
  image_url,
}));

