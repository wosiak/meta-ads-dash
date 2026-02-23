import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDashboardMetrics, getTopAds, getChartData } from '@/lib/dashboard'
import { MetricsCards } from '@/components/dashboard/MetricsCards'
import { SpendChart } from '@/components/dashboard/SpendChart'
import { TopAdsTable } from '@/components/dashboard/TopAdsTable'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { format, subDays } from 'date-fns'

interface PageProps {
  searchParams: Promise<{
    token?: string
    from?: string
    to?: string
  }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const headersList = await headers()
  const cookieStore = await cookies()
  
  // Obter client_id do header (setado pelo middleware)
  const clientId = headersList.get('x-client-id')
  const clientName = headersList.get('x-client-name')
  
  if (!clientId) {
    redirect('/login')
  }

  // Define período (padrão: últimos 30 dias)
  const today = new Date()
  const thirtyDaysAgo = subDays(today, 30)
  
  const dateFrom = params.from || format(thirtyDaysAgo, 'yyyy-MM-dd')
  const dateTo = params.to || format(today, 'yyyy-MM-dd')

  // Buscar dados do dashboard
  const [metrics, topAds, chartData] = await Promise.all([
    getDashboardMetrics(clientId, dateFrom, dateTo),
    getTopAds(clientId, dateFrom, dateTo, 10),
    getChartData(clientId, dateFrom, dateTo),
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {clientName || 'Dashboard'}
              </h1>
              <p className="text-gray-600 mt-1">
                Análise de performance Meta Ads
              </p>
            </div>
            <DateRangePicker />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Metrics Cards */}
        <MetricsCards data={metrics} />

        {/* Chart */}
        <SpendChart data={chartData} />

        {/* Top Ads Table */}
        <TopAdsTable data={topAds} />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600 text-sm">
          <p>© 2026 Meta Ads Dashboard. Desenvolvido com ❤️</p>
        </div>
      </footer>
    </div>
  )
}
