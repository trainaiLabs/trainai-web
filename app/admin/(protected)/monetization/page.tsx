'use client'

import { useEffect, useState } from 'react'
import {
  getMonetizationSettings,
  updateMonetizationSettings,
  getAdLogs,
  getAdPlacements,
  upsertAdPlacement,
  setAdPlacementActive,
  AdPlacement,
  MonetizationSettings,
} from '@/lib/admin/monetization'

export default function AdminMonetizationPage() {
  const [settings, setSettings] = useState<MonetizationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'settings' | 'logs' | 'placements'>('settings')
  const [logs, setLogs] = useState<any[]>([])
  const [logFilter, setLogFilter] = useState<'all' | 'hour' | 'today' | 'failed'>('all')
  const [logSearch, setLogSearch] = useState('')

  const [error, setError] = useState<string | null>(null)

  const [placements, setPlacements] = useState<AdPlacement[]>([])
  const [placementSaving, setPlacementSaving] = useState(false)

  const emptyPlacementForm = {
    id: null as string | null,
    placementKey: '',
    name: '',
    provider: 'custom' as AdPlacement['provider'],
    adType: 'banner' as AdPlacement['ad_type'],
    isActive: true,
    testMode: true,
    androidAdUnitId: '',
    iosAdUnitId: '',
    imageUrl: '',
    clickUrl: '',
    webviewUrl: '',
    title: '',
    description: '',
    buttonText: '',
    priority: 1,
  }

  const [placementForm, setPlacementForm] = useState(emptyPlacementForm)

  const load = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getMonetizationSettings()
      setSettings(data)
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '설정 불러오기 실패'
      console.error(e)
      setError(message)
    } finally {
      setLoading(false)
    }
  }
  const filteredLogs = logs.filter((log) => {
    const q = logSearch.trim().toLowerCase()

    const matchesSearch =
      !q ||
      (log.email ?? '').toLowerCase().includes(q) ||
      (log.nickname ?? '').toLowerCase().includes(q) ||
      (log.user_id ?? '').toLowerCase().includes(q)

    const unlockedAt = log.unlocked_at ? new Date(log.unlocked_at) : null
    const now = new Date()

    const matchesFilter =
      logFilter === 'all'
        ? true
        : logFilter === 'failed'
          ? log.ad_status === 'failed'
          : logFilter === 'hour'
            ? unlockedAt != null &&
            now.getTime() - unlockedAt.getTime() <= 1000 * 60 * 60
            : logFilter === 'today'
              ? unlockedAt != null &&
              unlockedAt.toDateString() === now.toDateString()
              : true

    return matchesSearch && matchesFilter
  })

  const loadLogs = async () => {
    try {
      const data = await getAdLogs()
      setLogs(data)
    } catch {
      alert('로그 불러오기 실패')
    }
  }

  const loadPlacements = async () => {
    try {
      const data = await getAdPlacements()
      setPlacements(data)
    } catch {
      alert('광고 위치 목록 불러오기 실패')
    }
  }

  const providerMap: Record<string, string> = {
    admob: 'AdMob',
    fake: '테스트',
  }

  const statusMap: Record<string, string> = {
    completed: '성공',
    failed: '실패',
    notReady: '준비 안 됨',
    skipped: '중간 종료',
  }

  const typeMap: Record<string, string> = {
    normal: '일반 퀘스트',
    expert: '전문 검토 퀘스트',
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (tab === 'logs') {
      loadLogs()
    }

    if (tab === 'placements') {
      loadPlacements()
    }
  }, [tab])

  const save = async () => {
    if (!settings) return

    setSaving(true)
    try {
      await updateMonetizationSettings(settings)
      alert('저장 완료')
    } catch {
      alert('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const resetPlacementForm = () => {
    setPlacementForm(emptyPlacementForm)
  }

  const editPlacement = (placement: AdPlacement) => {
    setPlacementForm({
      id: placement.id,
      placementKey: placement.placement_key,
      name: placement.name,
      provider: placement.provider,
      adType: placement.ad_type,
      isActive: placement.is_active,
      testMode: placement.test_mode,
      androidAdUnitId: placement.android_ad_unit_id ?? '',
      iosAdUnitId: placement.ios_ad_unit_id ?? '',
      imageUrl: placement.image_url ?? '',
      clickUrl: placement.click_url ?? '',
      webviewUrl: placement.webview_url ?? '',
      title: placement.title ?? '',
      description: placement.description ?? '',
      buttonText: placement.button_text ?? '',
      priority: placement.priority ?? 1,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const savePlacement = async () => {
    try {
      setPlacementSaving(true)

      await upsertAdPlacement(placementForm)

      alert('광고 위치/소재가 저장되었습니다.')
      resetPlacementForm()
      await loadPlacements()
    } catch (e) {
      console.error(e)

      const message =
        typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message?: unknown }).message)
          : '광고 위치/소재 저장 실패'

      alert(message)
    } finally {
      setPlacementSaving(false)
    }
  }

  const togglePlacementActive = async (placement: AdPlacement) => {
    try {
      await setAdPlacementActive(placement.id, !placement.is_active)
      await loadPlacements()
    } catch {
      alert('활성 상태 변경 실패')
    }
  }


  if (loading) {
    return <div className="p-6">로딩중...</div>
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="p-6">
        <div className="max-w-4xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          광고 설정 데이터가 없습니다.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-bold">광고 / 수익화 관리</h1>

      <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('settings')}
            className={`rounded-lg px-4 py-2 text-sm ${tab === 'settings'
              ? 'bg-black text-white'
              : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
          >
            설정
          </button>

          <button
            type="button"
            onClick={() => setTab('logs')}
            className={`rounded-lg px-4 py-2 text-sm ${tab === 'logs'
              ? 'bg-black text-white'
              : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
          >
            광고 로그
          </button>

          <button
            type="button"
            onClick={() => setTab('placements')}
            className={`rounded-lg px-4 py-2 text-sm ${tab === 'placements'
              ? 'bg-black text-white'
              : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
          >
            광고 위치 관리
          </button>
        </div>
      </section>
      {tab === 'settings' && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 space-y-4">

          <label className="flex justify-between">
            <span>광고 기능 활성화</span>
            <input
              type="checkbox"
              checked={settings.ads_enabled}
              onChange={(e) =>
                setSettings({ ...settings, ads_enabled: e.target.checked })
              }
            />
          </label>

          <label className="flex justify-between">
            <span>광고 해금 허용</span>
            <input
              type="checkbox"
              checked={settings.rewarded_quest_enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  rewarded_quest_enabled: e.target.checked,
                })
              }
            />
          </label>

          <label className="flex justify-between">
            <span>테스트 모드</span>
            <input
              type="checkbox"
              checked={settings.test_mode}
              onChange={(e) =>
                setSettings({ ...settings, test_mode: e.target.checked })
              }
            />
          </label>

          <label className="flex justify-between">
            <span>광고 실패시 버튼 허용</span>
            <input
              type="checkbox"
              checked={settings.fallback_button_enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  fallback_button_enabled: e.target.checked,
                })
              }
            />
          </label>

          <div>
            <div className="text-sm mb-1">광고 제공자</div>
            <select
              value={settings.default_ad_provider}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  default_ad_provider: e.target.value,
                })
              }
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="admob">AdMob</option>
              <option value="fake">Fake (테스트)</option>
            </select>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-black text-white rounded-lg py-2"
          >
            {saving ? '저장중...' : '저장'}
          </button>
        </div>
      )}
      {tab === 'logs' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <input
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="이메일, 닉네임, user_id 검색"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 md:max-w-sm"
              />

              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: '전체' },
                  { key: 'hour', label: '최근 1시간' },
                  { key: 'today', label: '오늘' },
                  { key: 'failed', label: '실패만' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setLogFilter(item.key as typeof logFilter)}
                    className={`rounded-lg border px-3 py-2 text-sm ${logFilter === item.key
                      ? 'bg-black text-white'
                      : 'border-zinc-200 hover:bg-zinc-50'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 text-sm text-zinc-500">
              표시: {filteredLogs.length}건 / 전체: {logs.length}건
            </div>
          </div>
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`rounded-xl border p-5 text-sm shadow-sm ${log.ad_status === 'failed'
                ? 'border-red-200 bg-red-50'
                : 'border-zinc-200 bg-white'
                }`}
            >
              <div className="mb-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${log.ad_status === 'failed'
                    ? 'bg-red-100 text-red-700'
                    : log.ad_status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-zinc-100 text-zinc-700'
                    }`}
                >
                  {log.ad_status
                    ? statusMap[log.ad_status] || log.ad_status
                    : '상태 없음'}
                </span>
              </div>
              <div className="font-semibold text-base mb-1">
                {log.nickname || '닉네임 없음'}
              </div>

              <div className="text-xs text-zinc-500 mb-3">
                {log.email || log.user_id}
              </div>

              <div className="space-y-1 text-sm">
                <div>
                  광고:{' '}
                  {log.rewarded_ad_network
                    ? providerMap[log.rewarded_ad_network] || log.rewarded_ad_network
                    : '-'}
                </div>

                <div>
                  결과:{' '}
                  {log.ad_status
                    ? statusMap[log.ad_status] || log.ad_status
                    : '-'}
                </div>

                <div>
                  해금 유형:{' '}
                  {log.unlock_type
                    ? typeMap[log.unlock_type] || log.unlock_type
                    : '-'}
                </div>

                <div>광고 위치: {log.placement_id || '-'}</div>
                <div>정책 키: {log.reward_policy_key || '-'}</div>
                <div>사용 여부: {log.is_consumed ? '사용됨' : '미사용'}</div>

                <div>
                  해금 시간:{' '}
                  {log.unlocked_at
                    ? new Date(log.unlocked_at).toLocaleString('ko-KR')
                    : '-'}
                </div>

                <div>
                  소비 시간:{' '}
                  {log.consumed_at
                    ? new Date(log.consumed_at).toLocaleString('ko-KR')
                    : '-'}
                </div>

                {log.metadata && typeof log.metadata === 'object' && (
                  <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <div className="mb-2 font-semibold text-zinc-800">
                      광고 상세 / 오류 정보
                    </div>

                    {'reason' in log.metadata && (
                      <div>사유: {String(log.metadata.reason)}</div>
                    )}

                    {'message' in log.metadata && (
                      <div>메시지: {String(log.metadata.message)}</div>
                    )}

                    {'error' in log.metadata && (
                      <div className="break-all">오류: {String(log.metadata.error)}</div>
                    )}

                    {'ad_watch_status' in log.metadata && (
                      <div>광고 상태: {String(log.metadata.ad_watch_status)}</div>
                    )}

                    {'source' in log.metadata && (
                      <div>기록 위치: {String(log.metadata.source)}</div>
                    )}

                    {'client_time' in log.metadata && (
                      <div>앱 기록 시간: {String(log.metadata.client_time)}</div>
                    )}

                    {'is_expert_mode' in log.metadata && (
                      <div>
                        전문 모드:{' '}
                        {String(log.metadata.is_expert_mode) === 'true' ? '예' : '아니오'}
                      </div>
                    )}

                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-zinc-600">
                        원본 metadata 보기
                      </summary>
                      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black p-3 text-xs text-white">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === 'placements' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              {placementForm.id ? '광고 위치/소재 수정' : '광고 위치/소재 등록'}
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">노출 위치 키</label>
                <input
                  value={placementForm.placementKey}
                  onChange={(e) =>
                    setPlacementForm({
                      ...placementForm,
                      placementKey: e.target.value,
                    })
                  }
                  placeholder="예: home_banner"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">관리 이름</label>
                <input
                  value={placementForm.name}
                  onChange={(e) =>
                    setPlacementForm({ ...placementForm, name: e.target.value })
                  }
                  placeholder="예: 홈 배너 광고"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">광고 제공자</label>
                <select
                  value={placementForm.provider}
                  onChange={(e) =>
                    setPlacementForm({
                      ...placementForm,
                      provider: e.target.value as AdPlacement['provider'],
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                >
                  <option value="admob">AdMob</option>
                  <option value="coupang">쿠팡</option>
                  <option value="naver">네이버</option>
                  <option value="custom">직접 등록</option>
                  <option value="fake">테스트</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">광고 유형</label>
                <select
                  value={placementForm.adType}
                  onChange={(e) =>
                    setPlacementForm({
                      ...placementForm,
                      adType: e.target.value as AdPlacement['ad_type'],
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                >
                  <option value="rewarded">보상형 SDK 광고</option>
                  <option value="banner">배너 이미지</option>
                  <option value="external_link">외부 링크</option>
                  <option value="webview">웹뷰</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Android 광고 ID</label>
                <input
                  value={placementForm.androidAdUnitId}
                  onChange={(e) =>
                    setPlacementForm({
                      ...placementForm,
                      androidAdUnitId: e.target.value,
                    })
                  }
                  placeholder="AdMob Android ad unit id"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">iOS 광고 ID</label>
                <input
                  value={placementForm.iosAdUnitId}
                  onChange={(e) =>
                    setPlacementForm({
                      ...placementForm,
                      iosAdUnitId: e.target.value,
                    })
                  }
                  placeholder="AdMob iOS ad unit id"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">이미지 URL</label>
                <input
                  value={placementForm.imageUrl}
                  onChange={(e) =>
                    setPlacementForm({
                      ...placementForm,
                      imageUrl: e.target.value,
                    })
                  }
                  placeholder="배너 이미지 URL"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">클릭 URL</label>
                <input
                  value={placementForm.clickUrl}
                  onChange={(e) =>
                    setPlacementForm({
                      ...placementForm,
                      clickUrl: e.target.value,
                    })
                  }
                  placeholder="외부 링크 또는 배너 클릭 URL"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">웹뷰 URL</label>
                <input
                  value={placementForm.webviewUrl}
                  onChange={(e) =>
                    setPlacementForm({
                      ...placementForm,
                      webviewUrl: e.target.value,
                    })
                  }
                  placeholder="앱 내부 웹뷰로 열 URL"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">우선순위</label>
                <input
                  type="number"
                  value={placementForm.priority}
                  onChange={(e) =>
                    setPlacementForm({
                      ...placementForm,
                      priority: Number(e.target.value || 1),
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">제목</label>
                <input
                  value={placementForm.title}
                  onChange={(e) =>
                    setPlacementForm({ ...placementForm, title: e.target.value })
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">버튼 문구</label>
                <input
                  value={placementForm.buttonText}
                  onChange={(e) =>
                    setPlacementForm({
                      ...placementForm,
                      buttonText: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium">설명</label>
              <textarea
                value={placementForm.description}
                onChange={(e) =>
                  setPlacementForm({
                    ...placementForm,
                    description: e.target.value,
                  })
                }
                className="min-h-[90px] w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={placementForm.isActive}
                  onChange={(e) =>
                    setPlacementForm({
                      ...placementForm,
                      isActive: e.target.checked,
                    })
                  }
                />
                활성화
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={placementForm.testMode}
                  onChange={(e) =>
                    setPlacementForm({
                      ...placementForm,
                      testMode: e.target.checked,
                    })
                  }
                />
                테스트 모드
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={resetPlacementForm}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
              >
                초기화
              </button>

              <button
                type="button"
                onClick={savePlacement}
                disabled={placementSaving}
                className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {placementSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">등록된 광고 위치</h2>
              <button
                type="button"
                onClick={loadPlacements}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
              >
                새로고침
              </button>
            </div>

            {placements.length === 0 ? (
              <div className="text-sm text-zinc-500">등록된 광고 위치가 없습니다.</div>
            ) : (
              <div className="space-y-3">
                {placements.map((placement) => (
                  <div
                    key={placement.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="font-semibold">{placement.name}</div>
                        <div className="mt-1 text-zinc-600">
                          위치: {placement.placement_key}
                        </div>
                        <div className="text-zinc-600">
                          제공자: {placement.provider} / 유형: {placement.ad_type}
                        </div>
                        <div className="text-zinc-600">
                          상태: {placement.is_active ? '활성' : '비활성'} / 테스트:{' '}
                          {placement.test_mode ? 'ON' : 'OFF'}
                        </div>
                        <div className="text-zinc-600">
                          우선순위: {placement.priority}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => editPlacement(placement)}
                          className="rounded-lg border border-zinc-200 px-3 py-2 hover:bg-white"
                        >
                          수정
                        </button>

                        <button
                          type="button"
                          onClick={() => togglePlacementActive(placement)}
                          className="rounded-lg border border-zinc-200 px-3 py-2 hover:bg-white"
                        >
                          {placement.is_active ? '비활성화' : '활성화'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}