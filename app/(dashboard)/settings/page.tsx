import { Settings as SettingsIcon, Target, Palette, Bell } from 'lucide-react'

export default function SettingsPage() {
  const sections = [
    { icon: Target, title: 'Metas', description: 'Defina metas de CPL, orçamento e resultados por conta.' },
    { icon: Palette, title: 'Aparência', description: 'Customize cores, layout e preferências de visualização.' },
    { icon: Bell, title: 'Notificações', description: 'Configure alertas por email, Slack ou push.' },
    { icon: SettingsIcon, title: 'Integrações', description: 'Gerencie conexões com Meta API e outras plataformas.' },
  ]

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Configurações</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie suas preferências e configurações do dashboard.
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((s) => (
          <div
            key={s.title}
            className="flex items-start gap-4 p-4 bg-card rounded-lg border border-border card-hover cursor-pointer"
          >
            <div className="p-2 bg-primary/10 rounded-md">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Configurações serão implementadas nas próximas versões.
      </p>
    </div>
  )
}
