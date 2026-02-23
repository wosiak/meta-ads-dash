'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useRouter, useSearchParams } from 'next/navigation'

interface DateRangePickerProps {
  className?: string
}

export function DateRangePicker({ className }: DateRangePickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    return {
      from: fromParam ? new Date(fromParam) : thirtyDaysAgo,
      to: toParam ? new Date(toParam) : today,
    }
  })

  const handleSelect = (newDate: DateRange | undefined) => {
    setDate(newDate)
    
    if (newDate?.from && newDate?.to) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('from', format(newDate.from, 'yyyy-MM-dd'))
      params.set('to', format(newDate.to, 'yyyy-MM-dd'))
      router.push(`?${params.toString()}`)
    }
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'dd MMM yyyy', { locale: ptBR })} -{' '}
                  {format(date.to, 'dd MMM yyyy', { locale: ptBR })}
                </>
              ) : (
                format(date.from, 'dd MMM yyyy', { locale: ptBR })
              )
            ) : (
              <span>Selecione um período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
