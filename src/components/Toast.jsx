import { Check, CircleAlert } from 'lucide-react';

// Aviso flotante simple: { type: 'success' | 'error', text }
export default function Toast({ toast }) {
  if (!toast) return null;
  const ok = toast.type === 'success';
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all ${
        ok ? 'bg-emerald-900 text-emerald-100 border-emerald-700' : 'bg-rose-900 text-rose-100 border-rose-700'
      }`}
    >
      {ok ? <Check className="w-5 h-5 text-emerald-400" /> : <CircleAlert className="w-5 h-5 text-rose-400" />}
      <span className="text-sm font-medium">{toast.text}</span>
    </div>
  );
}
