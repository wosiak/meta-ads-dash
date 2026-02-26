'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun, Monitor, Check, Palette, Monitor as MonitorIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Accent color palettes                                               */
/* ------------------------------------------------------------------ */
const PALETTES = [
  { id: 'teal',    name: 'Teal',       value: '172, 66%, 50%', hex: '#2dd4bf' },
  { id: 'violet',  name: 'Violeta',    value: '262, 83%, 63%', hex: '#a78bfa' },
  { id: 'blue',    name: 'Azul',       value: '217, 91%, 60%', hex: '#60a5fa' },
  { id: 'rose',    name: 'Rosa',       value: '348, 83%, 62%', hex: '#fb7185' },
  { id: 'amber',   name: 'Âmbar',     value: '38, 92%, 52%',  hex: '#fbbf24' },
  { id: 'emerald', name: 'Esmeralda', value: '152, 76%, 42%', hex: '#34d399' },
  { id: 'indigo',  name: 'Índigo',    value: '234, 89%, 65%', hex: '#818cf8' },
  { id: 'coral',   name: 'Coral',     value: '22, 93%, 55%',  hex: '#fb923c' },
] as const

type PaletteId = (typeof PALETTES)[number]['id']

function applyAccent(palette: (typeof PALETTES)[number]) {
  const val = `hsl(${palette.value})`
  const root = document.documentElement
  root.style.setProperty('--primary', val)
  root.style.setProperty('--accent', val)
  root.style.setProperty('--ring', val)
  root.style.setProperty('--sidebar-primary', val)
  root.style.setProperty('--sidebar-ring', val)
  root.style.setProperty('--chart-1', val)
  localStorage.setItem('accent-color', palette.id)
}

/* ------------------------------------------------------------------ */
/*  Settings page                                                       */
/* ------------------------------------------------------------------ */
export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [activeAccent, setActiveAccent] = useState<PaletteId>('teal')

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('accent-color') as PaletteId | null
    if (saved && PALETTES.some(p => p.id === saved)) {
      setActiveAccent(saved)
    }
  }, [])

  function handleAccentChange(palette: (typeof PALETTES)[number]) {
    setActiveAccent(palette.id)
    applyAccent(palette)
  }

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

      <div className="border-t border-border" />

      {/* ---- Accent color section ---- */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Cor de destaque</h3>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          Define a cor principal usada em botões, ícones ativos e destaques visuais.
        </p>

        <div className="grid grid-cols-4 gap-3">
          {PALETTES.map((palette) => {
            const isActive = activeAccent === palette.id
            return (
              <button
                key={palette.id}
                onClick={() => handleAccentChange(palette)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all duration-150 cursor-pointer',
                  isActive
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/40'
                )}
              >
                {/* Color swatch */}
                <div className="relative">
                  <div
                    className="h-9 w-9 rounded-full shadow-sm ring-2 ring-offset-2 ring-offset-card transition-all"
                    style={{
                      backgroundColor: palette.hex,
                      ringColor: isActive ? palette.hex : 'transparent',
                      outline: isActive ? `2px solid ${palette.hex}` : '2px solid transparent',
                      outlineOffset: '2px',
                    }}
                  />
                  {isActive && (
                    <span
                      className="absolute inset-0 flex items-center justify-center rounded-full"
                    >
                      <Check
                        className="h-4 w-4"
                        style={{ color: '#fff', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))' }}
                      />
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {palette.name}
                </span>
              </button>
            )
          })}
        </div>
      </section>

    </div>
  )
}
