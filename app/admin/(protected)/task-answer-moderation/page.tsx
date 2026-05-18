'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Tab = 'answers' | 'keywords'

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

function statusClass(status: string) {
  switch (status) {
    case 'auto_hidden':
      return 'border-orange-200 bg-orange-50 text-orange-700'
    case 'admin_hidden':
      return 'border-red-200 bg-red-50 text-red-700'
    case 'approved':
      return 'border-green-200 bg-green-50 text-green-700'
    case 'visible':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    default:
      return 'border-gray-200 bg-gray-50 text-gray-600'
  }
}

export default function TaskAnswerModerationPage() {
  const [tab, setTab] = useState<Tab>('answers')
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
    const reason = prompt('거절 사유를 입력해주세요.', 'admin_rejected')
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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">답변 검수</h1>
        <p className="mt-2 text-sm text-gray-500">
          유저가 작성한 답변을 검수하고 금칙어를 관리합니다.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTab('answers')}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              tab === 'answers'
                ? 'bg-black text-white'
                : 'border border-gray-200 bg-white text-gray-700'
            }`}
          >
            답변 검수
          </button>
          <button
            onClick={() => setTab('keywords')}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              tab === 'keywords'
                ? 'bg-black text-white'
                : 'border border-gray-200 bg-white text-gray-700'
            }`}
          >
            금칙어 관리
          </button>
        </div>
      </div>

      {tab === 'answers' && (
        <>
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-[1fr_160px]">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-900">
                  검색
                </label>
                <input
                  value={keywordFilter}
                  onChange={(e) => setKeywordFilter(e.target.value)}
                  placeholder="답변 내용 또는 문제 검색"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-gray-900">
                  상태
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="all">전체</option>
                  <option value="visible">노출중</option>
                  <option value="auto_hidden">자동숨김</option>
                  <option value="admin_hidden">관리자숨김</option>
                  <option value="approved">승인됨</option>
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_120px]">
              <input
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
                placeholder="user_id 검색"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
              />

              <button
                onClick={loadAnswers}
                disabled={loadingAnswers}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold hover:bg-gray-50 disabled:text-gray-400"
              >
                {loadingAnswers ? '검색중' : '새로고침'}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">답변 목록</h2>
              <span className="text-sm text-gray-500">총 {answers.length}개</span>
            </div>

            {loadingAnswers ? (
              <p className="py-8 text-center text-sm text-gray-500">
                불러오는 중...
              </p>
            ) : answers.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                검색된 답변이 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {answers.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusClass(
                              item.moderation_status,
                            )}`}
                          >
                            {statusLabel(item.moderation_status)}
                          </span>

                          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-bold text-gray-600">
                            {reasonLabel(item.moderation_reason)}
                          </span>

                          <span className="rounded-full border border-purple-100 bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700">
                            선택 {item.selected_count ?? 0}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600">
                          유저: {item.user_id}
                        </p>
                        <p className="text-sm text-gray-500">
                          작성일: {formatDate(item.created_at)}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => approveAnswer(item.id)}
                          disabled={actionLoadingId === item.id}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-bold hover:bg-gray-50 disabled:text-gray-400"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => rejectAnswer(item.id)}
                          disabled={actionLoadingId === item.id}
                          className="rounded-xl bg-black px-3 py-1.5 text-sm font-bold text-white disabled:bg-gray-300"
                        >
                          거절
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl bg-gray-50 p-3 text-sm leading-6 text-gray-800 whitespace-pre-wrap">
                      {item.answer_text}
                    </div>

                    {item.prompt_text && (
                      <div className="mt-3 rounded-2xl border border-gray-200 p-3 text-sm text-gray-700">
                        <p className="mb-2 font-bold text-gray-900">문제</p>
                        <p className="whitespace-pre-wrap">{item.prompt_text}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'keywords' && (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">새 금칙어 추가</h2>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_120px]">
              <input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="차단할 단어 입력"
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
              />

              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="profanity">욕설</option>
                <option value="sexual">선정적 표현</option>
                <option value="spam">스팸</option>
              </select>

              <button
                onClick={addKeyword}
                className="rounded-xl bg-black px-4 py-3 text-sm font-bold text-white"
              >
                추가
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">금칙어 목록</h2>
              <span className="text-sm text-gray-500">
                총 {keywords.length}개
              </span>
            </div>

            {loadingKeywords ? (
              <p className="py-8 text-center text-sm text-gray-500">
                불러오는 중...
              </p>
            ) : keywords.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                등록된 금칙어가 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {keywords.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{item.keyword}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {reasonLabel(item.category)} · {formatDate(item.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                          item.is_active
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
                        }`}
                      >
                        {item.is_active ? '활성' : '비활성'}
                      </span>

                      <button
                        onClick={() => toggleKeyword(item)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold hover:bg-gray-50"
                      >
                        {item.is_active ? '비활성' : '활성'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}