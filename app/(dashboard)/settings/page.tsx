'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun, Monitor, Check, Monitor as MonitorIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Settings page                                                       */
/* ------------------------------------------------------------------ */
export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const THEME_OPTIONS = [
    {
      id: 'dark',
      label: 'Escuro',
      description: 'Tema padrão com fundo escuro, ideal para monitores.',
      icon: Moon,
    },
    {
      id: 'light',
      label: 'Claro',
      description: 'Fundo claro, indicado para ambientes bem iluminados.',
      icon: Sun,
    },
    {
      id: 'system',
      label: 'Sistema',
      description: 'Segue automaticamente a preferência do seu sistema.',
      icon: Monitor,
    },
  ] as const

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Configurações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize a aparência e o comportamento do dashboard.
        </p>
      </div>

      {/* ---- Theme section ---- */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <MonitorIcon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Tema</h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ id, label, description, icon: Icon }) => {
            const isActive = mounted && theme === id
            return (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={cn(
                  'relative flex flex-col items-start gap-2 p-4 rounded-lg border text-left transition-all duration-150 cursor-pointer',
                  isActive
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-card/80'
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                  </span>
                )}
                <Icon
                  className={cn(
                    'h-5 w-5',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <div>
                  <p className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-foreground')}>
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Preview hint */}
        {mounted && (
          <p className="text-xs text-muted-foreground pl-1">
            Tema atual aplicado:{' '}
            <span className="text-foreground font-medium">
              {resolvedTheme === 'dark' ? 'Escuro' : 'Claro'}
            </span>
          </p>
        )}
      </section>

    </div>
  )
}
