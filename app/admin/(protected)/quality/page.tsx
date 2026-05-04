'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import AdminGuard from '@/lib/admin/admin_guard'
import {
  getQualityProjectSummaries,
  updateProjectAssignmentOrders,
  QualityProjectSummary,
} from '@/lib/admin/quality'

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

function toInt(value: unknown) {
  if (typeof value === 'number') return Math.trunc(value)
  if (typeof value === 'string') return Number.parseInt(value, 10) || 0
  return 0
}

function progressRate(item: QualityProjectSummary) {
  const total = toInt(item.total_tasks)
  if (total <= 0) return 0

  const progressed =
    toInt(item.agreed_tasks) +
    toInt(item.disputed_tasks) +
    toInt(item.review_required_tasks) +
    toInt(item.expert_review_tasks) +
    toInt(item.admin_review_required_tasks) +
    toInt(item.complete_tasks)

  return (progressed / total) * 100
}

function completionRate(item: QualityProjectSummary) {
  const total = toInt(item.total_tasks)
  if (total <= 0) return 0
  return (toInt(item.complete_tasks) / total) * 100
}

function statusLabel(item: QualityProjectSummary) {
  if (!item.is_active) return '비활성'
  if (toInt(item.admin_review_required_tasks) > 0) return '관리자 검토 필요'
  if (toInt(item.expert_review_tasks) > 0) return '전문 검토 중'
  if (toInt(item.review_required_tasks) > 0) return '재검토 필요'
  if (toInt(item.total_tasks) > 0 && toInt(item.complete_tasks) === toInt(item.total_tasks)) {
    return '완료'
  }
  return '진행 중'
}

function SortableProjectCard({
  item,
  index,
}: {
  item: QualityProjectSummary
  index: number
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ${
        isDragging ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50 active:cursor-grabbing"
          aria-label="drag project"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="w-8 text-sm font-bold text-zinc-500">
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{item.title}</div>
          <div className="mt-1 text-xs text-zinc-500">
            현재 배정순서: {item.assignment_order ?? '-'} · 전체 작업:{' '}
            {item.total_tasks}
          </div>
        </div>

        {item.is_priority && (
          <span className="rounded-full bg-orange-50 px-2 py-1 text-xs text-orange-700">
            우선
          </span>
        )}
      </div>
    </div>
  )
}

export default function AdminQualityPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<QualityProjectSummary[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'admin' | 'review' | 'complete'>('active')
  const [editMode, setEditMode] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderedItems, setOrderedItems] = useState<QualityProjectSummary[]>([])
  const [checkingRole, setCheckingRole] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  )

  const load = async () => {
    try {
      setLoading(true)
      const data = await getQualityProjectSummaries()
      setItems(data)
      setOrderedItems(data)
    } catch (e) {
      console.error(e)
      alert('품질 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    setOrderedItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id)
      const newIndex = prev.findIndex((item) => item.id === over.id)

      if (oldIndex < 0 || newIndex < 0) return prev

      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  const saveOrder = async () => {
    try {
      setSavingOrder(true)

      const updates = orderedItems.map((item, index) => ({
        project_id: item.id,
        assignment_order: index + 1,
      }))

      await updateProjectAssignmentOrders(updates)

      alert('프로젝트 우선순위가 저장되었습니다.')
      setEditMode(false)
      await load()
    } catch (e) {
      console.error(e)
      alert('프로젝트 우선순위 저장 실패')
    } finally {
      setSavingOrder(false)
    }
  }

  const cancelEditOrder = () => {
    setOrderedItems(items)
    setEditMode(false)
  }

  useEffect(() => {
    const checkRoleAndLoad = async () => {
      const { data: role, error } = await supabase.rpc('get_my_admin_role')

      if (error || !role || !['super_admin', 'reviewer'].includes(String(role))) {
        router.replace('/admin/dashboard')
        return
      }

      setCheckingRole(false)
      await load()
    }

    checkRoleAndLoad()
  }, [router])

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (filter === 'active') return item.is_active
        if (filter === 'admin') return toInt(item.admin_review_required_tasks) > 0
        if (filter === 'review') {
          return (
            toInt(item.review_required_tasks) > 0 ||
            toInt(item.expert_review_tasks) > 0
          )
        }
        if (filter === 'complete') {
          return toInt(item.total_tasks) > 0 && toInt(item.complete_tasks) === toInt(item.total_tasks)
        }
        return true
      })
      .sort((a, b) => {
        const adminDiff =
          toInt(b.admin_review_required_tasks) - toInt(a.admin_review_required_tasks)
        if (adminDiff !== 0) return adminDiff

        const priorityDiff = Number(b.is_priority) - Number(a.is_priority)
        if (priorityDiff !== 0) return priorityDiff

        return toInt(a.assignment_order) - toInt(b.assignment_order)
      })
  }, [items, filter])

  const totalProjects = items.length
  const activeProjects = items.filter((e) => e.is_active).length
  const adminRequired = items.reduce(
    (sum, e) => sum + toInt(e.admin_review_required_tasks),
    0,
  )
  const totalTasks = items.reduce((sum, e) => sum + toInt(e.total_tasks), 0)

  if (checkingRole) {
    return <div className="p-8">권한 확인 중...</div>
  }

  if (loading) {
    return <div className="p-8">로딩중...</div>
  }

  return (
    <AdminGuard allow={['super_admin', 'reviewer']}>
    <div className="w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">품질 관리</h1>
        <p className="mt-2 text-sm text-zinc-500">
          프로젝트별 품질 상태, 재검토, 전문 검토, 관리자 최종 검토 대상을 확인합니다.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {!editMode ? (
            <button
              type="button"
              onClick={() => {
                setOrderedItems(filteredItems)
                setEditMode(true)
              }}
              className="rounded-lg bg-black px-4 py-2 text-sm text-white"
            >
              우선순위 편집
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={saveOrder}
                disabled={savingOrder}
                className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {savingOrder ? '저장 중...' : '순서 저장'}
              </button>

              <button
                type="button"
                onClick={cancelEditOrder}
                disabled={savingOrder}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
              >
                취소
              </button>
            </>
          )}

          {editMode && (
            <span className="text-sm text-zinc-500">
              프로젝트를 드래그해서 배정 우선순위를 바꾼 뒤 저장하세요.
            </span>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-zinc-500">전체 프로젝트</div>
          <div className="mt-2 text-2xl font-bold">{totalProjects}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-zinc-500">활성 프로젝트</div>
          <div className="mt-2 text-2xl font-bold">{activeProjects}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-zinc-500">전체 작업</div>
          <div className="mt-2 text-2xl font-bold">{totalTasks}</div>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="text-sm text-red-600">관리자 검토 필요</div>
          <div className="mt-2 text-2xl font-bold text-red-700">{adminRequired}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            ['all', '전체'],
            ['active', '활성'],
            ['admin', '관리자 검토'],
            ['review', '재검토/전문검토'],
            ['complete', '완료'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key as typeof filter)}
              className={`rounded-lg px-4 py-2 text-sm ${
                filter === key
                  ? 'bg-black text-white'
                  : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {label}
            </button>
          ))}

          <button
            type="button"
            onClick={load}
            className="ml-auto rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
          >
            새로고침
          </button>
        </div>
      </section>

      {editMode ? (
        <section className="space-y-3">
          <DndContext
          sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {orderedItems.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
                    정렬할 프로젝트가 없습니다.
                  </div>
                ) : (
                  orderedItems.map((item, index) => (
                    <SortableProjectCard
                      key={item.id}
                      item={item}
                      index={index}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
        </section>
      ) : (
        <section className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
              표시할 프로젝트가 없습니다.
            </div>
          ) : (
            filteredItems.map((item) => {
              const progress = progressRate(item)
              const complete = completionRate(item)
              const adminCount = toInt(item.admin_review_required_tasks)
              const reviewCount =
                toInt(item.review_required_tasks) + toInt(item.expert_review_tasks)

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(`/admin/quality/${item.id}`)}
                  className={`w-full rounded-2xl border p-5 text-left shadow-sm ${
                    adminCount > 0
                      ? 'border-red-200 bg-red-50'
                      : 'border-zinc-200 bg-white hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold">{item.title}</h2>
                        <span className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs">
                          {statusLabel(item)}
                        </span>
                        {item.is_priority && (
                          <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-xs text-orange-700">
                            우선 프로젝트
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-zinc-500">
                        배정순서 {item.assignment_order ?? '-'} · 전체 {item.total_tasks}개
                      </p>

                      <div className="mt-4 grid gap-2 text-sm md:grid-cols-4">
                        <div>대기: {item.pending_tasks}</div>
                        <div>재검토: {item.review_required_tasks}</div>
                        <div>전문검토: {item.expert_review_tasks}</div>
                        <div>완료: {item.complete_tasks}</div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-1 text-xs text-zinc-500">
                          진행률 {progress.toFixed(1)}% / 완료율 {complete.toFixed(1)}%
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                          <div
                            className="h-full rounded-full bg-black"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      {adminCount > 0 && (
                        <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-700">
                          관리자 {adminCount}
                        </span>
                      )}
                      {reviewCount > 0 && (
                        <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-700">
                          검토 {reviewCount}
                        </span>
                      )}
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">
                        평가 {item.total_evaluations}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </section>
      )}
    </div>
    </AdminGuard>
  )
}