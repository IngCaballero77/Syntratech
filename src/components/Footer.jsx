import { Truck, ShieldCheck, RefreshCw, Package } from 'lucide-react';
import { IS_CONNECTED } from '../lib/supabaseClient';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-12 border-b border-slate-800">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-800">
            <div className="w-12 h-12 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Despachos Eficientes</h4>
              <p className="text-xs text-slate-400 mt-0.5">Trazabilidad por guía en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-800">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Seguridad RLS Estricta</h4>
              <p className="text-xs text-slate-400 mt-0.5">Control de acceso y privacidad RBAC</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-800">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Control de Inventario</h4>
              <p className="text-xs text-slate-400 mt-0.5">Existencias auditadas sin sobreventas</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-800">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Comercio Comunitario</h4>
              <p className="text-xs text-slate-400 mt-0.5">Potenciando redes productivas locales</p>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-10">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold">
                <Package className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">Syntratech</span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Herramienta web robusta y transaccional para la gestión de inventarios, pedidos y envíos en tiendas comunitarias. Diseñada bajo arquitectura moderna con React y PostgreSQL/Supabase.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${IS_CONNECTED ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-xs text-slate-400">
                {IS_CONNECTED ? 'Supabase Conectado' : 'Modo Demostración / Almacén Local'}
              </span>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Roles y Módulos</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• Portal de Clientes (Catálogo &amp; Checkout)</li>
              <li>• Abastecimiento e Inventario (Proveedor)</li>
              <li>• Centro de Despachos &amp; Guías</li>
              <li>• Analítica &amp; Control Global (Admin)</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Tecnologías</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• React 18 + Vite</li>
              <li>• React Router</li>
              <li>• Tailwind CSS (Sky &amp; Slate)</li>
              <li>• Supabase (PostgreSQL + RLS)</li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Syntratech. Todos los derechos reservados.</p>
          <p className="sm:text-right">
            Desarrollado por{' '}
            <span className="text-white font-bold">Juan Camilo Caballero Sánchez</span>,{' '}
            <span className="text-white font-bold">Andrés Vargas</span> y{' '}
            <span className="text-white font-bold">Santiago Olaya Cuadros</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
