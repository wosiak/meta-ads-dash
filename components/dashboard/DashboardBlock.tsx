'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardBlockProps {
  id:           string
  title:        string
  collapsed:    boolean
  onToggle:     () => void
  onMoveUp?:    () => void
  onMoveDown?:  () => void
  isFirst?:     boolean
  isLast?:      boolean
  children:     React.ReactNode
  fullWidth?:   boolean
}

export function DashboardBlock({
  id,
  title,
  collapsed,
  onToggle,
  onMoveUp,
  onMoveDown,
  isFirst  = false,
  isLast   = false,
  children,
  fullWidth = false,
}: DashboardBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: React.CSSProperties = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.4 : 1,
    zIndex:     isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card rounded-lg border border-border overflow-hidden',
        fullWidth && 'col-span-full',
        isDragging && 'shadow-2xl ring-1 ring-primary/30',
      )}
    >
      {/* ── Header — clicável inteiro para toggle (exceto área dos ícones) ── */}
      <div
        onClick={onToggle}
        className="flex items-center gap-1 px-3 py-2.5 border-b border-border/60 bg-card select-none cursor-pointer hover:bg-secondary/30 transition-colors"
      >
        {collapsed ? (
          /* Alça de arrastar — só quando minimizado */
          <button
            {...attributes}
            {...listeners}
            onClick={e => e.stopPropagation()}
            className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors shrink-0 touch-none p-0.5"
            aria-label="Arrastar bloco"
            tabIndex={-1}
          >
            <GripVertical size={15} />
          </button>
        ) : (
          /* Setas de reordenar — só quando expandido */
          <div
            className="flex flex-col shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={e => { e.stopPropagation(); onMoveUp?.() }}
              disabled={isFirst}
              className={cn(
                'p-0.5 rounded transition-colors leading-none',
                isFirst
                  ? 'text-muted-foreground/20 cursor-default'
                  : 'text-muted-foreground/50 hover:text-foreground',
              )}
              aria-label="Mover para cima"
            >
              <ChevronUp size={13} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onMoveDown?.() }}
              disabled={isLast}
              className={cn(
                'p-0.5 rounded transition-colors leading-none',
                isLast
                  ? 'text-muted-foreground/20 cursor-default'
                  : 'text-muted-foreground/50 hover:text-foreground',
              )}
              aria-label="Mover para baixo"
            >
              <ChevronDown size={13} />
            </button>
          </div>
        )}

        {/* Título */}
        <span className="flex-1 text-sm font-medium text-foreground truncate mx-1">
          {title}
        </span>

        {/* Ícone indicador de estado (não é botão — o clique vem do header inteiro) */}
        <span className="text-muted-foreground shrink-0 p-0.5">
          {collapsed
            ? <ChevronRight size={16} />
            : <ChevronDown  size={16} />
          }
        </span>
      </div>

      {/* ── Conteúdo (oculto quando minimizado) ─────────────────────────── */}
      {!collapsed && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  )
}
