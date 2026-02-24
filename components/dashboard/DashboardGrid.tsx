'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { LayoutList, LayoutGrid, GripVertical, ChevronRight } from 'lucide-react'
import { DashboardBlock } from './DashboardBlock'

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface BlockConfig {
  id:         string
  title:      string
  fullWidth?: boolean
  content:    React.ReactNode
}

interface LayoutState {
  order:     string[]
  collapsed: Record<string, boolean>
  gridMode:  boolean
}

const STORAGE_KEY = 'dashboard-layout-v1'

function loadLayout(ids: string[]): LayoutState {
  if (typeof window === 'undefined') {
    return { order: ids, collapsed: {}, gridMode: false }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { order: ids, collapsed: {}, gridMode: false }

    const saved = JSON.parse(raw) as Partial<LayoutState>

    const savedOrder = (saved.order ?? []).filter(id => ids.includes(id))
    const newIds     = ids.filter(id => !savedOrder.includes(id))

    return {
      order:     [...savedOrder, ...newIds],
      collapsed: saved.collapsed ?? {},
      gridMode:  saved.gridMode  ?? false,
    }
  } catch {
    return { order: ids, collapsed: {}, gridMode: false }
  }
}

// ─── Preview do DragOverlay — apenas o header do bloco ───────────────────────
function DragPreview({ title }: { title: string }) {
  return (
    <div className="bg-card rounded-lg border border-primary shadow-2xl ring-1 ring-primary/30 cursor-grabbing">
      <div className="flex items-center gap-1 px-3 py-2.5">
        <GripVertical size={15} className="text-primary shrink-0" />
        <span className="flex-1 text-sm font-medium text-foreground truncate mx-1">
          {title}
        </span>
        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
interface DashboardGridProps {
  blocks: BlockConfig[]
}

export function DashboardGrid({ blocks }: DashboardGridProps) {
  const ids = blocks.map(b => b.id)

  const [layout,   setLayout]   = useState<LayoutState>(() => loadLayout(ids))
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
    } catch { /* ignora erros de quota */ }
  }, [layout])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    setLayout(prev => ({
      ...prev,
      order: arrayMove(
        prev.order,
        prev.order.indexOf(String(active.id)),
        prev.order.indexOf(String(over.id)),
      ),
    }))
  }, [])

  const handleDragCancel = useCallback(() => setActiveId(null), [])

  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    setLayout(prev => {
      const idx    = prev.order.indexOf(id)
      if (idx < 0) return prev
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= prev.order.length) return prev
      return { ...prev, order: arrayMove(prev.order, idx, target) }
    })
  }, [])

  const toggleCollapsed = useCallback((id: string) => {
    setLayout(prev => ({
      ...prev,
      collapsed: { ...prev.collapsed, [id]: !prev.collapsed[id] },
    }))
  }, [])

  const toggleGridMode = useCallback(() => {
    setLayout(prev => ({ ...prev, gridMode: !prev.gridMode }))
  }, [])

  const blockMap     = Object.fromEntries(blocks.map(b => [b.id, b]))
  const orderedBlocks = layout.order.filter(id => blockMap[id]).map(id => blockMap[id])

  // Renderiza um bloco (evita repetição nos dois modos)
  const renderBlock = (block: BlockConfig, idx: number, total: number) => (
    <DashboardBlock
      key={block.id}
      id={block.id}
      title={block.title}
      // Quando está sendo arrastado, força aparência de minimizado (sem conteúdo)
      collapsed={!!layout.collapsed[block.id] || activeId === block.id}
      onToggle={() => toggleCollapsed(block.id)}
      onMoveUp={() => moveBlock(block.id, 'up')}
      onMoveDown={() => moveBlock(block.id, 'down')}
      isFirst={idx === 0}
      isLast={idx === total - 1}
    >
      {block.content}
    </DashboardBlock>
  )

  return (
    <div className="space-y-3">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-1">
        <span className="text-xs text-muted-foreground mr-2">Visualização:</span>
        <button
          onClick={() => layout.gridMode && toggleGridMode()}
          className={[
            'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors',
            !layout.gridMode
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground',
          ].join(' ')}
          title="Lista (1 por linha)"
        >
          <LayoutList size={13} />
          Lista
        </button>
        <button
          onClick={() => !layout.gridMode && toggleGridMode()}
          className={[
            'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors',
            layout.gridMode
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground',
          ].join(' ')}
          title="Grade (2 por linha)"
        >
          <LayoutGrid size={13} />
          Grade
        </button>
      </div>

      {/* ── Blocos ───────────────────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={layout.order} strategy={verticalListSortingStrategy}>
          {layout.gridMode ? (
            /* Grade — duas colunas independentes (sem espaço vazio) */
            <div className="hidden lg:flex gap-3 items-start">
              {[0, 1].map(col => {
                const colBlocks = orderedBlocks.filter((_, i) => i % 2 === col)
                return (
                  <div key={col} className="flex flex-col gap-3 flex-1 min-w-0">
                    {colBlocks.map((block, colIdx) =>
                      renderBlock(block, layout.order.indexOf(block.id), layout.order.length)
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* Lista */
            <div className="flex flex-col gap-3">
              {orderedBlocks.map((block, idx) =>
                renderBlock(block, idx, orderedBlocks.length)
              )}
            </div>
          )}
        </SortableContext>

        {/* DragOverlay: preview limpo do bloco sendo arrastado (só o header) */}
        <DragOverlay dropAnimation={null}>
          {activeId && blockMap[activeId] ? (
            <DragPreview title={blockMap[activeId].title} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Fallback lista para telas pequenas quando em modo grade */}
      {layout.gridMode && (
        <div className="flex lg:hidden flex-col gap-3">
          {orderedBlocks.map((block, idx) =>
            renderBlock(block, idx, orderedBlocks.length)
          )}
        </div>
      )}
    </div>
  )
}
