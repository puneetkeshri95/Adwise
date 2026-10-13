import { useApp } from '../contexts/AppContext.jsx'
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'

const KIND_META = {
  success: { icon: CheckCircle2, iconClass: 'text-emerald-500 dark:text-emerald-400' },
  info: { icon: Info, iconClass: 'text-brand-500 dark:text-brand-400' },
  error: { icon: AlertTriangle, iconClass: 'text-red-500 dark:text-red-400' },
}

export default function Toasts() {
  const { toasts, dismissToast } = useApp()

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const meta = KIND_META[t.kind] || KIND_META.info
        const Icon = meta.icon
        return (
          <div
            key={t.id}
            className={`pointer-events-auto min-w-[300px] max-w-sm animate-slide-in-right elevated-bg border rounded-xl shadow-card px-4 py-3 flex items-start gap-3 border-default`}
          >
            <Icon size={16} className={`mt-0.5 flex-shrink-0 ${meta.iconClass}`} />
            <div className="flex-1 min-w-0">
              {t.title && <div className="text-primary text-[13px] font-semibold truncate">{t.title}</div>}
              {t.message && <div className="text-secondary text-[12px] mt-0.5">{t.message}</div>}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-muted hover:text-primary transition"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
