'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { SlidersHorizontal, RefreshCw, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { setSelectedAccount } from '@/app/actions/account'
import { syncAdAccounts } from '@/app/actions/syncAccounts'
import { PERIOD_OPTIONS, DEFAULT_PERIOD, periodToDates, type PeriodValue } from '@/lib/periods'
import type { MetaAdAccount } from '@/types/database'

interface TopBarProps {
  accounts?: MetaAdAccount[]
  selectedAccountId?: string
}

export function TopBar({ accounts = [], selectedAccountId }: TopBarProps) {
  const router        = useRouter()
  const pathname      = usePathname()
  const searchParams  = useSearchParams()

  const [accountSearch, setAccountSearch] = useState('')
  const [showFilters, setShowFilters]   = useState(false)
  const [isPending, startTransition]    = useTransition()
  const [syncStatus, setSyncStatus]     = useState<'idle' | 'success' | 'error'>('idle')
  const [syncMessage, setSyncMessage]   = useState<string | null>(null)

  const filteredAccounts = accountSearch.trim()
    ? accounts.filter(a =>
        a.account_name.toLowerCase().includes(accountSearch.toLowerCase()) ||
        a.meta_account_id.toLowerCase().includes(accountSearch.toLowerCase())
      )
    : accounts

  // Determina o período atual lendo os search params existentes.
  // Se ainda não houver from/to na URL, usa o padrão "30d".
  const currentFrom = searchParams.get('from')
  const currentTo   = searchParams.get('to')

  function matchPeriod(): PeriodValue {
    if (!currentFrom || !currentTo) return DEFAULT_PERIOD
    for (const opt of PERIOD_OPTIONS) {
      const { from, to } = periodToDates(opt.value)
      if (from === currentFrom && to === currentTo) return opt.value
    }
    return DEFAULT_PERIOD
  }

  function handleAccountChange(accountId: string) {
    startTransition(async () => {
      await setSelectedAccount(accountId)
      router.refresh()
    })
  }

  function handleSyncAccounts() {
    setSyncStatus('idle')
    setSyncMessage(null)
    startTransition(async () => {
      const result = await syncAdAccounts()
      if ('error' in result) {
        setSyncStatus('error')
        setSyncMessage(result.error ?? 'Erro desconhecido')
      } else {
        setSyncStatus('success')
        setSyncMessage(`${result.count} conta${result.count !== 1 ? 's' : ''} sincronizada${result.count !== 1 ? 's' : ''}`)
        router.refresh()
      }
    })
  }

  function handlePeriodChange(period: PeriodValue) {
    const { from, to } = periodToDates(period)
    const params = new URLSearchParams(searchParams.toString())
    params.set('from', from)
    params.set('to', to)
    router.push(`${pathname}?${params.toString()}`)
  }

  const selectedAccount = accounts.find(a => a.id === selectedAccountId)

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      {/* Main row */}
      <div className="flex items-center gap-3 h-14 px-4 lg:px-6">

        {/* Seletor de conta de anúncio */}
        {accounts.length > 0 && (
          <Select
            value={selectedAccountId}
            onValueChange={handleAccountChange}
            disabled={isPending}
            onOpenChange={open => { if (!open) setAccountSearch('') }}
          >
            <SelectTrigger
              className={cn(
                'h-9 text-sm bg-secondary border-border font-medium min-w-[160px] max-w-[260px]',
                isPending && 'opacity-60 cursor-wait',
              )}
            >
              <SelectValue placeholder="Selecionar conta">
                {selectedAccount?.account_name ?? 'Selecionar conta'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="p-0">
              {/* Campo de busca fixo no topo */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border sticky top-0 bg-popover z-10">
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <input
                  placeholder="Buscar conta..."
                  value={accountSearch}
                  onChange={e => setAccountSearch(e.target.value)}
                  // Impede o Select de capturar os eventos de teclado
                  onKeyDown={e => e.stopPropagation()}
                  className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                  autoComplete="off"
                />
                {accountSearch && (
                  <button
                    onClick={() => setAccountSearch('')}
                    className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Lista filtrada */}
              <div className="max-h-64 overflow-y-auto py-1">
                {filteredAccounts.length > 0 ? (
                  filteredAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{account.account_name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {account.meta_account_id} · {account.currency}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Nenhuma conta encontrada
                  </div>
                )}
              </div>

              {/* Contador */}
              {accounts.length > 0 && (
                <div className="px-3 py-1.5 border-t border-border">
                  <span className="text-[10px] text-muted-foreground">
                    {filteredAccounts.length} de {accounts.length} conta{accounts.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </SelectContent>
          </Select>
        )}

        {/* Sem contas: placeholder */}
        {accounts.length === 0 && (
          <span className="text-sm text-muted-foreground hidden sm:block">
            Nenhuma conta encontrada
          </span>
        )}

        {/* Botão "Buscar novas contas" */}
        <button
          onClick={handleSyncAccounts}
          disabled={isPending}
          className={cn(
            'flex items-center gap-1.5 h-9 px-3 rounded-md border text-xs font-medium shrink-0',
            'transition-colors',
            syncStatus === 'error'
              ? 'border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20'
              : syncStatus === 'success'
              ? 'border-success/50 bg-success/10 text-success hover:bg-success/20'
              : 'border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80',
            isPending && 'opacity-60 cursor-wait',
          )}
        >
          <RefreshCw className={cn('h-3.5 w-3.5 shrink-0', isPending && 'animate-spin')} />
          <span className="hidden sm:inline whitespace-nowrap">
            {isPending
              ? 'Buscando...'
              : syncMessage
              ? syncMessage
              : 'Buscar novas contas'}
          </span>
        </button>

        {/* Seletor de período — atualiza ?from=&to= na URL */}
        <Select value={matchPeriod()} onValueChange={v => handlePeriodChange(v as PeriodValue)}>
          <SelectTrigger className="w-[180px] h-9 text-sm bg-secondary border-border">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(p => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filters toggle (mobile) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 lg:hidden"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>


        <div className="flex-1" />
      </div>

      {/* Expanded filters row */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 border-t border-border',
          showFilters ? 'max-h-14 py-2 px-4' : 'max-h-0',
        )}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Select>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-secondary border-border">
              <SelectValue placeholder="Objetivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="conversions">Conversões</SelectItem>
              <SelectItem value="traffic">Tráfego</SelectItem>
              <SelectItem value="reach">Alcance</SelectItem>
              <SelectItem value="leads">Leads</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-secondary border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="error">Com erro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  )
}
