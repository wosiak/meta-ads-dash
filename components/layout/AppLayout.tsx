import { AppSidebar } from './AppSidebar'
import { TopBar } from './TopBar'
import type { MetaAdAccount } from '@/types/database'

interface AppLayoutProps {
  children: React.ReactNode
  accounts?: MetaAdAccount[]
  selectedAccountId?: string
}

export function AppLayout({ children, accounts = [], selectedAccountId }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar accounts={accounts} selectedAccountId={selectedAccountId} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
