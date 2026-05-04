'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  finalizeTaskReview,
  getQualityProjectDetail,
  QualityProjectDetail,
  QualityTask,
} from '@/lib/admin/quality'

function toInt(value: unknown) {
  if (typeof value === 'number') return Math.trunc(value)
  if (typeof value === 'string') return Number.parseInt(value, 10) || 0
  return 0
}

function toPercent(value: unknown) {
  if (typeof value === 'number') return value <= 1 ? value * 100 : value
  if (typeof value === 'string') {
    const n = Number.parseFloat(value)
    if (Number.isNaN(n)) return 0
    return n <= 1 ? n * 100 : n
  }
  return 0
}

function statusLabel(status?: string | null) {
  switch (status) {
    case 'admin_review_required':
      return '관리자 검토 필요'
    case 'expert_review':
      return '전문 검토 중'
    case 'review_required':
      return '재검토 필요'
    case 'disputed':
      return '이견 발생'
    case 'agreed':
      return '합의 완료'
    case 'complete':
      return '완료'
    case 'pending':
    default:
      return '대기'
  }
}

function decisionSourceLabel(value?: string | null) {
  switch (value) {
    case 'general':
      return '일반 유저 합의'
    case 'expert':
      return '전문가 검토'
    case 'gold':
      return '전문가 검토'
    case 'admin':
      return '관리자 최종 확정'
    case 'system':
      return '시스템 판정'
    default:
      return '확인 필요'
  }
}

function choiceLabel(value?: string | null) {
  if (value === 'a') return 'A'
  if (value === 'b') return 'B'
  if (value === 'tie') return '동률'
  if (value === 'skip') return '건너뜀'
  return '-'
}

export default function AdminQualityDetailPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = String(params.projectId ?? '')

  const [loading, setLoading] = useState(true)
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null)
  const [data, setData] = useState<QualityProjectDetail | null>(null)
  const [filter, setFilter] = useState<'all' | 'admin' | 'review' | 'complete'>('all')

  const load = async () => {
    try {
      setLoading(true)
      const result = await getQualityProjectDetail(projectId)
      setData(result)
    } catch (e) {
      console.error(e)
      alert('상세 품질 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) load()
  }, [projectId])

  const tasks = useMemo(() => {
    const list = data?.tasks ?? []

    return list
      .filter((task) => {
        const status = task.consensus_status ?? 'pending'

        if (filter === 'admin') return status === 'admin_review_required'
        if (filter === 'review') {
          return ['review_required', 'expert_review', 'disputed'].includes(status)
        }
        if (filter === 'complete') return status === 'complete'

        return true
      })
      .sort((a, b) => {
        const priority = (task: QualityTask) => {
          const status = task.consensus_status ?? 'pending'
          if (status === 'admin_review_required') return 0
          if (status === 'expert_review') return 1
          if (status === 'review_required') return 2
          if (status === 'disputed') return 3
          if (status === 'pending') return 4
          if (status === 'complete') return 9
          return 5
        }

        return priority(a) - priority(b)
      })
  }, [data, filter])

  const submitFinalReview = async (
    task: QualityTask,
    finalChoice: 'a' | 'b',
  ) => {
    const taskId = task.id ?? task.task_id
    if (!taskId) return

    const note = window.prompt(
      `${finalChoice.toUpperCase()}로 최종 확정합니다.\n검토 메모를 입력하세요. 빈칸도 가능합니다.`,
      '',
    )

    if (note === null) return

    try {
      setSavingTaskId(taskId)

      await finalizeTaskReview({
        taskId,
        finalChoice,
        reviewNote: note,
      })

      alert('관리자 최종 검토가 저장되었습니다.')
      await load()
    } catch (e) {
      console.error(e)
      alert('관리자 최종 검토 저장에 실패했습니다.')
    } finally {
      setSavingTaskId(null)
    }
  }

  if (loading) return <div>로딩중...</div>

  const project = data?.project ?? {}

  return (
    <div className="w-full max-w-6xl space-y-6">
      <div>
        <button
          type="button"
          onClick={() => router.push('/admin/quality')}
          className="mb-4 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
        >
          ← 품질 목록
        </button>

        <h1 className="text-2xl font-bold">
          {String(project.title ?? '프로젝트 상세 품질')}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          작업별 A/B 투표 결과, 신뢰도, 관리자 최종 검토를 확인합니다.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 text-sm md:grid-cols-4">
          <div>
            <div className="text-zinc-500">프로젝트 ID</div>
            <div className="mt-1 break-all font-medium">{String(project.id ?? projectId)}</div>
          </div>
          <div>
            <div className="text-zinc-500">활성화</div>
            <div className="mt-1 font-medium">{project.is_active ? '예' : '아니오'}</div>
          </div>
          <div>
            <div className="text-zinc-500">우선 프로젝트</div>
            <div className="mt-1 font-medium">{project.is_priority ? '예' : '아니오'}</div>
          </div>
          <div>
            <div className="text-zinc-500">배정 순서</div>
            <div className="mt-1 font-medium">{String(project.assignment_order ?? '-')}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            ['all', '전체'],
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

      <section className="space-y-4">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
            표시할 작업이 없습니다.
          </div>
        ) : (
          tasks.map((task, index) => {
            const taskId = task.id ?? task.task_id ?? ''
            const status = task.consensus_status ?? 'pending'
            const confidence = toPercent(task.confidence)
            const aCount = toInt(task.a_count)
            const bCount = toInt(task.b_count)
            const tieCount = toInt(task.tie_count)
            const skipCount = toInt(task.skip_count)
            const totalCount = toInt(task.total_count)
            const canAdminReview = status === 'admin_review_required'
            const isSaving = savingTaskId === taskId

            return (
              <div
                key={taskId || index}
                className={`rounded-2xl border p-5 shadow-sm ${
                  canAdminReview
                    ? 'border-red-200 bg-red-50'
                    : status === 'complete'
                      ? 'border-green-200 bg-green-50'
                      : 'border-zinc-200 bg-white'
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold">작업 {index + 1}</h2>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs">
                        {statusLabel(status)}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
                        신뢰도 {confidence.toFixed(0)}%
                      </span>
                    </div>
                    <p className="mt-2 break-all text-xs text-zinc-500">
                      task_id: {taskId}
                    </p>
                  </div>

                  <div className="text-sm">
                    최종 결과:{' '}
                    <span className="font-bold">
                      {choiceLabel(task.final_choice ?? task.admin_final_choice)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    결정 출처: {decisionSourceLabel(task.decision_source)}
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="text-xs font-semibold text-zinc-500">질문</div>
                    <div className="mt-1">{task.question ?? '-'}</div>
                    {task.input_text && (
                      <div className="mt-2 text-sm text-zinc-600">
                        입력문: {task.input_text}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="font-bold">A</div>
                        <div className="rounded-full bg-zinc-100 px-2 py-1 text-xs">
                          {aCount}표
                        </div>
                      </div>
                      <div className="text-sm">{task.answer_a ?? '-'}</div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="font-bold">B</div>
                        <div className="rounded-full bg-zinc-100 px-2 py-1 text-xs">
                          {bCount}표
                        </div>
                      </div>
                      <div className="text-sm">{task.answer_b ?? '-'}</div>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm md:grid-cols-5">
                    <div className="rounded-xl bg-white p-3">A: {aCount}</div>
                    <div className="rounded-xl bg-white p-3">B: {bCount}</div>
                    <div className="rounded-xl bg-white p-3">동률: {tieCount}</div>
                    <div className="rounded-xl bg-white p-3">건너뜀: {skipCount}</div>
                    <div className="rounded-xl bg-white p-3">총: {totalCount}</div>
                    <div>
                      전문검토: {toInt(task.expert_review_completed)} / {toInt(task.expert_review_target) || 3}
                    </div>
                  </div>

                  {task.admin_review_note && (
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
                      <div className="font-semibold">관리자 메모</div>
                      <div className="mt-1 text-zinc-700">{task.admin_review_note}</div>
                    </div>
                  )}

                  {canAdminReview && (
                    <div className="flex flex-col gap-2 md:flex-row">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => submitFinalReview(task, 'a')}
                        className="flex-1 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        A로 최종 확정
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => submitFinalReview(task, 'b')}
                        className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold disabled:opacity-50"
                      >
                        B로 최종 확정
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}