import { Zap } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full bg-card rounded-lg border border-border shadow-lg p-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Zap className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">
            Meta Ads Dashboard
          </h1>
        </div>

        <div className="space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-sm text-foreground font-medium mb-2">
              Acesso para Clientes
            </p>
            <p className="text-sm text-muted-foreground">
              Use o link com seu token de acesso:
            </p>
            <code className="text-xs bg-secondary text-primary px-2 py-1 rounded mt-2 block font-mono">
              dashboard.com?token=seu_token
            </code>
          </div>

          <div className="bg-secondary/50 border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Área administrativa em desenvolvimento
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
