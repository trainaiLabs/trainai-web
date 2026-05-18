'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type TaskAnswer = {
  id: string
  task_id: string
  user_id: string
  answer_type: string
  answer_text: string | null
  is_visible: boolean
  is_blocked: boolean
  moderation_status: string
  moderation_reason: string | null
  selected_count: number
  created_at: string
  updated_at: string
  prompt_text: string | null
}

type ModerationKeyword = {
  id: string
  keyword: string
  category: string
  is_active: boolean
  created_at: string
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ko-KR')
}

function statusLabel(status: string) {
  switch (status) {
    case 'visible':
      return '노출중'
    case 'auto_hidden':
      return '자동숨김'
    case 'admin_hidden':
      return '관리자숨김'
    case 'approved':
      return '승인됨'
    default:
      return status
  }
}

function reasonLabel(reason?: string | null) {
  switch (reason) {
    case 'profanity':
      return '욕설'
    case 'sexual':
      return '선정적 표현'
    case 'spam':
      return '스팸'
    case 'admin_rejected':
      return '관리자 거절'
    default:
      return reason || '-'
  }
}

function badgeClass(status: string) {
  switch (status) {
    case 'auto_hidden':
      return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'admin_hidden':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'approved':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'visible':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

export default function TaskAnswerModerationPage() {
  const [tab, setTab] = useState<'answers' | 'keywords'>('answers')

  const [answers, setAnswers] = useState<TaskAnswer[]>([])
  const [keywords, setKeywords] = useState<ModerationKeyword[]>([])

  const [loadingAnswers, setLoadingAnswers] = useState(false)
  const [loadingKeywords, setLoadingKeywords] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [keywordFilter, setKeywordFilter] = useState('')

  const [newKeyword, setNewKeyword] = useState('')
  const [newCategory, setNewCategory] = useState('profanity')

  const hiddenCount = useMemo(
    () =>
      answers.filter(
        (item) =>
          item.moderation_status === 'auto_hidden' ||
          item.moderation_status === 'admin_hidden',
      ).length,
    [answers],
  )

  async function loadAnswers() {
    setLoadingAnswers(true)

    const { data, error } = await supabase.rpc('admin_search_task_answers', {
      p_status: statusFilter,
      p_user_id: userIdFilter.trim() || null,
      p_keyword: keywordFilter.trim() || null,
    })

    if (error) {
      alert(`답변 목록 불러오기 실패: ${error.message}`)
      setLoadingAnswers(false)
      return
    }

    setAnswers(Array.isArray(data) ? data : [])
    setLoadingAnswers(false)
  }

  async function loadKeywords() {
    setLoadingKeywords(true)

    const { data, error } = await supabase.rpc(
      'admin_list_moderation_keywords',
    )

    if (error) {
      alert(`금칙어 목록 불러오기 실패: ${error.message}`)
      setLoadingKeywords(false)
      return
    }

    setKeywords(Array.isArray(data) ? data : [])
    setLoadingKeywords(false)
  }

  useEffect(() => {
    loadAnswers()
    loadKeywords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function approveAnswer(id: string) {
    if (!confirm('이 답변을 다시 노출 승인할까요?')) return

    setActionLoadingId(id)

    const { error } = await supabase.rpc('admin_approve_task_answer', {
      p_answer_id: id,
    })

    setActionLoadingId(null)

    if (error) {
      alert(`승인 실패: ${error.message}`)
      return
    }

    await loadAnswers()
  }

  async function rejectAnswer(id: string) {
    const reason = prompt(
      '거절 사유를 입력해주세요. 비워두면 관리자 거절로 저장됩니다.',
      'admin_rejected',
    )

    if (reason === null) return

    setActionLoadingId(id)

    const { error } = await supabase.rpc('admin_reject_task_answer', {
      p_answer_id: id,
      p_reason: reason.trim() || 'admin_rejected',
    })

    setActionLoadingId(null)

    if (error) {
      alert(`거절 실패: ${error.message}`)
      return
    }

    await loadAnswers()
  }

  async function addKeyword() {
    const keyword = newKeyword.trim()

    if (!keyword) {
      alert('추가할 단어를 입력해주세요.')
      return
    }

    const { error } = await supabase.rpc('admin_add_moderation_keyword', {
      p_keyword: keyword,
      p_category: newCategory,
    })

    if (error) {
      alert(`금칙어 추가 실패: ${error.message}`)
      return
    }

    setNewKeyword('')
    await loadKeywords()
  }

  async function toggleKeyword(item: ModerationKeyword) {
    const { error } = await supabase.rpc(
      'admin_set_moderation_keyword_active',
      {
        p_keyword_id: item.id,
        p_is_active: !item.is_active,
      },
    )

    if (error) {
      alert(`상태 변경 실패: ${error.message}`)
      return
    }

    await loadKeywords()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-purple-100 bg-gradient-to-br from-white to-purple-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-purple-600">
              TrainAI Admin
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-900">
              답변 / 금칙어 관리
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              유저가 직접 작성한 답변을 검수하고 금칙어를 관리합니다.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTab('answers')}
              className={`rounded-2xl px-4 py-2 text-sm font-bold ${
                tab === 'answers'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              답변 검수
            </button>
            <button
              onClick={() => setTab('keywords')}
              className={`rounded-2xl px-4 py-2 text-sm font-bold ${
                tab === 'keywords'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              금칙어 관리
            </button>
          </div>
        </div>
      </div>

      {tab === 'answers' && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">현재 목록</p>
              <p className="mt-1 text-2xl font-black">{answers.length}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">숨김 답변</p>
              <p className="mt-1 text-2xl font-black text-red-600">
                {hiddenCount}
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">검색 상태</p>
              <p className="mt-1 text-lg font-black">
                {statusFilter === 'all' ? '전체' : statusLabel(statusFilter)}
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">금칙어 수</p>
              <p className="mt-1 text-2xl font-black">{keywords.length}</p>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr_120px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-purple-400"
              >
                <option value="all">전체 상태</option>
                <option value="visible">노출중</option>
                <option value="auto_hidden">자동숨김</option>
                <option value="admin_hidden">관리자숨김</option>
                <option value="approved">승인됨</option>
              </select>

              <input
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
                placeholder="유저 ID 검색"
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-purple-400"
              />

              <input
                value={keywordFilter}
                onChange={(e) => setKeywordFilter(e.target.value)}
                placeholder="답변 내용 또는 문제 검색"
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-purple-400"
              />

              <button
                onClick={loadAnswers}
                disabled={loadingAnswers}
                className="rounded-2xl bg-purple-600 px-4 py-3 text-sm font-bold text-white disabled:bg-gray-300"
              >
                {loadingAnswers ? '검색중' : '검색'}
              </button>
            </div>
          </div>

          {loadingAnswers ? (
            <div className="rounded-3xl border bg-white p-8 text-center text-gray-500 shadow-sm">
              불러오는 중...
            </div>
          ) : answers.length === 0 ? (
            <div className="rounded-3xl border bg-white p-8 text-center text-gray-500 shadow-sm">
              검색된 답변이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {answers.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${badgeClass(
                            item.moderation_status,
                          )}`}
                        >
                          {statusLabel(item.moderation_status)}
                        </span>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600">
                          {reasonLabel(item.moderation_reason)}
                        </span>
                        <span className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                          선택 {item.selected_count ?? 0}
                        </span>
                      </div>

                      <div className="text-xs text-gray-400">
                        유저: {item.user_id}
                      </div>
                      <div className="text-xs text-gray-400">
                        작성일: {formatDate(item.created_at)}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => approveAnswer(item.id)}
                        disabled={actionLoadingId === item.id}
                        className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-bold text-white disabled:bg-gray-300"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => rejectAnswer(item.id)}
                        disabled={actionLoadingId === item.id}
                        className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:bg-gray-300"
                      >
                        거절
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-800 whitespace-pre-wrap">
                    {item.answer_text}
                  </div>

                  {item.prompt_text && (
                    <div className="mt-4 rounded-2xl border border-gray-100 p-4">
                      <p className="mb-2 text-xs font-bold text-gray-400">
                        문제
                      </p>
                      <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap">
                        {item.prompt_text}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'keywords' && (
        <div className="space-y-5">
          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">새 금칙어 추가</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_120px]">
              <input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="차단할 단어 입력"
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-purple-400"
              />

              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-purple-400"
              >
                <option value="profanity">욕설</option>
                <option value="sexual">선정적 표현</option>
                <option value="spam">스팸</option>
              </select>

              <button
                onClick={addKeyword}
                className="rounded-2xl bg-purple-600 px-4 py-3 text-sm font-bold text-white"
              >
                추가
              </button>
            </div>
          </div>

          {loadingKeywords ? (
            <div className="rounded-3xl border bg-white p-8 text-center text-gray-500 shadow-sm">
              불러오는 중...
            </div>
          ) : keywords.length === 0 ? (
            <div className="rounded-3xl border bg-white p-8 text-center text-gray-500 shadow-sm">
              등록된 금칙어가 없습니다.
            </div>
          ) : (
            <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_120px_120px] bg-gray-50 px-5 py-3 text-xs font-bold text-gray-500">
                <div>단어</div>
                <div>분류</div>
                <div>상태</div>
                <div className="text-right">관리</div>
              </div>

              {keywords.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_120px_120px_120px] items-center border-t px-5 py-4 text-sm"
                >
                  <div className="font-bold text-gray-900">
                    {item.keyword}
                    <div className="mt-1 text-xs font-normal text-gray-400">
                      {formatDate(item.created_at)}
                    </div>
                  </div>

                  <div className="text-gray-600">
                    {reasonLabel(item.category)}
                  </div>

                  <div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        item.is_active
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-gray-50 text-gray-500'
                      }`}
                    >
                      {item.is_active ? '활성' : '비활성'}
                    </span>
                  </div>

                  <div className="text-right">
                    <button
                      onClick={() => toggleKeyword(item)}
                      className={`rounded-xl px-3 py-2 text-xs font-bold text-white ${
                        item.is_active ? 'bg-gray-500' : 'bg-purple-600'
                      }`}
                    >
                      {item.is_active ? '비활성' : '활성'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}