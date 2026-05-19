'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../../lib/supabase/client'
import Papa from 'papaparse'
import { useRouter } from 'next/navigation'
import AdminGuard from '@/lib/admin/admin_guard'

type ProjectForm = {
  title: string
  description: string
  projectKind: string
  taskType: string
  rewardPerTask: string
  targetTaskCount: string
  evaluationCriteria: string
}

type CsvRow = Record<string, string>

const initialForm: ProjectForm = {
  title: '',
  description: '',
  projectKind: 'internal_training',
  taskType: 'preference',
  rewardPerTask: '10',
  targetTaskCount: '100',
  evaluationCriteria: 'naturalness',
}

export default function ProjectsPage() {

  const router = useRouter()
  const [checkingRole, setCheckingRole] = useState(true)

  useEffect(() => {
    const checkRole = async () => {
      const { data: role, error } = await supabase.rpc('get_my_admin_role')

      if (error || !role || !['super_admin', 'uploader'].includes(String(role))) {
        router.replace('/admin/dashboard')
        return
      }

      setCheckingRole(false)
    }

    checkRole()
  }, [router])

  const [useExistingProject, setUseExistingProject] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [form, setForm] = useState<ProjectForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [successText, setSuccessText] = useState('')
  const [createdProjectId, setCreatedProjectId] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [projects, setProjects] = useState<Record<string, unknown>[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [updatingProjectId, setUpdatingProjectId] = useState('')
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({})
  const projectStatusOptions = [
    'draft',
    'pending',
    'active',
    'paused',
    'completed',
    'archived',
  ]

  const selectedProject = projects.find(
    (project) => String(project['id'] ?? '') === selectedProjectId
  )

  const effectiveTaskType = useExistingProject
    ? String(selectedProject?.['task_type'] ?? '')
    : form.taskType

  const effectiveEvaluationCriteria = useExistingProject
    ? String(selectedProject?.['evaluation_criteria'] ?? '')
    : form.evaluationCriteria

  const effectiveRewardPoints = useExistingProject
    ? Number(selectedProject?.['reward_per_task'] ?? 0)
    : Number(form.rewardPerTask)

  const updateField = (key: keyof ProjectForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleUpdateStatus = async (projectId: string) => {
    const nextStatus = statusDrafts[projectId]?.trim()

    if (!nextStatus) {
      setErrorText('변경할 상태값을 입력해 주세요.')
      return
    }

    setUpdatingProjectId(projectId)
    setErrorText('')
    setSuccessText('')

    const { error } = await supabase.rpc('admin_update_project_status', {
      p_project_id: projectId,
      p_status: nextStatus,
    })

    if (error) {
      setErrorText(`상태 변경 실패: ${error.message}`)
      setUpdatingProjectId('')
      return
    }

    setSuccessText('프로젝트 상태가 변경되었습니다.')
    await loadProjects()
    setUpdatingProjectId('')
  }

  const loadProjects = async () => {
    setProjectsLoading(true)

    const { data, error } = await supabase.rpc('admin_list_projects')

    if (error) {
      console.error('프로젝트 목록 불러오기 실패:', error)
      setProjects([])
      setProjectsLoading(false)
      return
    }

    const projectList = (data as Record<string, unknown>[]) ?? []

    setProjects(projectList)

    const nextDrafts: Record<string, string> = {}
    for (const project of projectList) {
      const id = String(project['id'] ?? '')
      const status = String(project['status'] ?? '')
      if (id) {
        nextDrafts[id] = status
      }
    }
    setStatusDrafts(nextDrafts)

    setProjectsLoading(false)

  }
  useEffect(() => {
    loadProjects()
  }, [])

  const currentCriteria = useExistingProject
    ? String(selectedProject?.['evaluation_criteria'] ?? 'other')
    : form.evaluationCriteria

  const instructionText = useMemo(() => {
    switch (currentCriteria) {
      case 'naturalness':
        return '더 자연스러운 답변을 고르세요'
      case 'accuracy':
        return '더 정확한 답변을 고르세요'
      case 'helpfulness':
        return '더 도움이 되는 답변을 고르세요'
      case 'politeness':
        return '더 공손한 답변을 고르세요'
      case 'safety':
        return '더 안전한 답변을 고르세요'
      default:
        return '더 좋은 답변을 고르세요'
    }
  }, [currentCriteria])

  const normalizeHeader = (value: string) => {
    return value
      .replace(/\ufeff/g, '')
      .replace(/"/g, '')
      .trim()
      .toLowerCase()
  }

  const handleCsvFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorText('')
    setSuccessText('')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawFields = results.meta.fields ?? []
        const normalizedHeaders = rawFields.map(normalizeHeader)

        const requiredHeaders = ['input_text', 'option_a', 'option_b']
        const missing = requiredHeaders.filter(
          (header) => !normalizedHeaders.includes(header)
        )

        if (missing.length > 0) {
          setParsedRows([])
          setHeaders([])
          setSelectedFileName(file.name)
          setErrorText(
            `필수 컬럼이 없습니다: ${missing.join(', ')} / 현재 헤더: ${normalizedHeaders.join(', ')}`
          )
          return
        }

        const rows = (results.data as Record<string, unknown>[]).map((row) => {
          const normalizedRow: CsvRow = {}

          for (const [key, value] of Object.entries(row)) {
            normalizedRow[normalizeHeader(key)] = String(value ?? '').trim()
          }

          return normalizedRow
        })

        setSelectedFileName(file.name)
        setHeaders(normalizedHeaders)
        setParsedRows(rows)
      },
      error: (error) => {
        setErrorText(`CSV 파싱 실패: ${error.message}`)
      },
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorText('')
    setSuccessText('')
    setCreatedProjectId('')

    if (parsedRows.length === 0) {
      setErrorText('먼저 CSV 파일을 선택해 주세요.')
      setLoading(false)
      return
    }

    let projectId = ''

    if (useExistingProject) {
      if (!selectedProjectId) {
        setErrorText('업로드할 기존 프로젝트를 선택해 주세요.')
        setLoading(false)
        return
      }

      projectId = selectedProjectId
    } else {
      const { data, error } = await supabase.rpc('admin_create_project', {
        p_company_id: '558f2c35-48de-4e13-8cca-73b0031bb625',
        p_title: form.title,
        p_description: form.description || null,
        p_project_kind: form.projectKind,
        p_task_type: form.taskType,
        p_reward_per_task: Number(form.rewardPerTask),
        p_target_task_count: Number(form.targetTaskCount),
        p_evaluation_criteria: form.evaluationCriteria,
      })

      if (error) {
        setErrorText(String((error as any).message))
        setLoading(false)
        return
      }

      const result = data as Record<string, unknown> | null

      if (!result || !result['project_id']) {
        setErrorText(`응답 확인 필요: ${JSON.stringify(result)}`)
        setLoading(false)
        return
      }

      projectId = result['project_id'] as string
    }

    const effectiveTaskType = useExistingProject
      ? String(selectedProject?.['task_type'] ?? '')
      : form.taskType

    const effectiveEvaluationCriteria = useExistingProject
      ? String(selectedProject?.['evaluation_criteria'] ?? '')
      : form.evaluationCriteria

    const effectiveRewardPoints = useExistingProject
      ? Number(selectedProject?.['reward_per_task'] ?? 0)
      : Number(form.rewardPerTask)

    const { data: insertData, error: insertError } = await supabase.rpc(
      'admin_insert_preference_tasks',
      {
        p_project_id: projectId,
        p_rows: parsedRows,
        p_task_type: effectiveTaskType,
        p_task_category: effectiveTaskType,
        p_reward_points: effectiveRewardPoints,
        p_evaluation_criteria: effectiveEvaluationCriteria,
      }
    )

    if (insertError) {
      setErrorText(`업로드 실패: ${insertError.message}`)
      setCreatedProjectId(projectId)
      setLoading(false)
      return
    }

    const insertResult = insertData as {
      success?: boolean
      inserted_count?: number
      db_skipped_count?: number
      file_duplicate_count?: number
      empty_skipped_count?: number
      target_task_count?: number
    } | null

    const insertedCount = Number(insertResult?.inserted_count ?? 0)
    const dbSkippedCount = Number(insertResult?.db_skipped_count ?? 0)
    const fileDuplicateCount = Number(insertResult?.file_duplicate_count ?? 0)
    const emptySkippedCount = Number(insertResult?.empty_skipped_count ?? 0)
    const targetTaskCount = Number(insertResult?.target_task_count ?? 0)

    setSuccessText(
      [
        useExistingProject
          ? '기존 프로젝트에 CSV 업로드 완료'
          : '프로젝트 생성 및 CSV 업로드 완료',
        '',
        `등록 완료: ${insertedCount}개`,
        `기존 DB 중복 제외: ${dbSkippedCount}개`,
        `업로드 파일 중복 제외: ${fileDuplicateCount}개`,
        `빈 질문 제외: ${emptySkippedCount}개`,
        '',
        `현재 프로젝트 총 퀘스트: ${targetTaskCount}개`,
      ].join('\n')
    )
    setCreatedProjectId(projectId)
    setForm(initialForm)
    setSelectedFileName('')
    setParsedRows([])
    setHeaders([])
    setSelectedProjectId('')
    await loadProjects()
    setLoading(false)
  }

  if (checkingRole) {
    return <div className="p-8">권한 확인 중...</div>
  }

  return (
    <AdminGuard allow={['super_admin', 'uploader']}>
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">프로젝트 생성</h1>
        <p className="text-zinc-600 mb-6">
          새 프로젝트를 만들고 CSV 업로드로 task를 넣을 수 있습니다.
        </p>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="radio"
                    name="projectMode"
                    checked={!useExistingProject}
                    onChange={() => setUseExistingProject(false)}
                  />
                  새 프로젝트 생성 후 CSV 업로드
                </label>

                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="radio"
                    name="projectMode"
                    checked={useExistingProject}
                    onChange={() => setUseExistingProject(true)}
                  />
                  기존 프로젝트 선택 후 CSV 업로드
                </label>

                {useExistingProject && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      업로드할 프로젝트 선택
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-500"
                    >
                      <option value="">프로젝트를 선택하세요</option>
                      {projects.map((project) => (
                        <option
                          key={String(project['id'] ?? '')}
                          value={String(project['id'] ?? '')}
                        >
                          {String(project['title'] ?? '')} / {String(project['project_kind'] ?? '')} / {String(project['status'] ?? '')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {!useExistingProject && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    프로젝트 제목
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-500"
                    placeholder="예: 자연스러움 선호도 데이터셋"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    설명
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-500 min-h-28"
                    placeholder="프로젝트 설명을 입력하세요."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      프로젝트 종류
                    </label>
                    <select
                      value={form.projectKind}
                      onChange={(e) => updateField('projectKind', e.target.value)}
                      className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-500"
                    >
                      <option value="client_paid">client_paid / 외부 의뢰</option>
                      <option value="internal_training">internal_training / 내부 상시</option>
                      <option value="gold_quality">gold_quality / 품질 평가</option>
                      <option value="event_campaign">event_campaign / 이벤트</option>
                      <option value="demo">demo / 운영 테스트</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      작업 유형
                    </label>
                    <select
                      value={form.taskType}
                      onChange={(e) => updateField('taskType', e.target.value)}
                      className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-500"
                    >
                      <option value="preference">preference</option>
                      <option value="accuracy">accuracy</option>
                      <option value="safety">safety</option>
                      <option value="translation_preference">translation_preference</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      작업당 보상 포인트
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.rewardPerTask}
                      onChange={(e) => updateField('rewardPerTask', e.target.value)}
                      className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      목표 작업 수
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.targetTaskCount}
                      onChange={(e) => updateField('targetTaskCount', e.target.value)}
                      className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    평가 기준
                  </label>
                  <select
                    value={form.evaluationCriteria}
                    onChange={(e) => updateField('evaluationCriteria', e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-500"
                  >
                    <option value="naturalness">naturalness</option>
                    <option value="accuracy">accuracy</option>
                    <option value="helpfulness">helpfulness</option>
                    <option value="politeness">politeness</option>
                    <option value="safety">safety</option>
                    <option value="other">other</option>
                  </select>
                </div>
              </>
            )}

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              자동 적용 문구: <span className="font-medium">{instructionText}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                CSV 파일 업로드
              </label>

              <label
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${selectedFileName
                    ? 'border-green-500 bg-green-50'
                    : 'border-zinc-300 bg-zinc-50 hover:border-black hover:bg-zinc-100'
                  }`}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFile}
                  className="hidden"
                />

                <div className="text-sm font-medium text-zinc-800">
                  CSV 파일 선택
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  클릭해서 업로드
                </div>

                {selectedFileName && (
                  <div className="mt-4 rounded-lg bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm">
                    선택 파일: {selectedFileName}
                  </div>
                )}
              </label>

              <p className="mt-2 text-xs text-zinc-500">
                필수 헤더: input_text, option_a, option_b / 선택 헤더: prompt, question, external_key
              </p>
            </div>

            {selectedFileName && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                선택 파일: {selectedFileName}
                {headers.length > 0 && (
                  <div className="mt-1 text-xs text-zinc-500">
                    헤더: {headers.join(', ')}
                  </div>
                )}
                <div className="mt-1 text-xs text-zinc-500">
                  파싱된 행 수: {parsedRows.length}
                </div>
              </div>
            )}

            {errorText && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorText}
              </div>
            )}

            {successText && (
              <div className="whitespace-pre-line rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <div>{successText}</div>
                {createdProjectId && (
                  <div className="mt-1 text-xs break-all">
                    project_id: {createdProjectId}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-black px-5 py-3 text-white font-medium hover:bg-zinc-800 disabled:opacity-60"
            >
              {loading ? '생성 중...' : '프로젝트 생성'}
            </button>
          </form>
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-zinc-900">프로젝트 목록</h2>
              <button
                type="button"
                onClick={loadProjects}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                새로고침
              </button>
            </div>

            {projectsLoading ? (
              <p className="text-zinc-500 text-sm">불러오는 중...</p>
            ) : projects.length === 0 ? (
              <p className="text-zinc-500 text-sm">프로젝트가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-zinc-600">
                      <th className="py-3 pr-4">제목</th>
                      <th className="py-3 pr-4">상태</th>
                      <th className="py-3 pr-4">진행률</th>
                      <th className="py-3 pr-4">목표 수</th>
                      <th className="py-3 pr-4">상태 변경</th>
                      <th className="py-3 pr-4">상세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project, index) => (
                      <tr
                        key={String(project['id'] ?? index)}
                        className="border-b border-zinc-100"
                      >
                        <td className="py-3 pr-4 font-medium text-zinc-900">
                          {String(project['title'] ?? '')}
                        </td>
                        <td className="py-3 pr-4 text-zinc-700">
                          {String(project['status'] ?? '')}
                        </td>
                        <td className="py-3 pr-4 text-zinc-700 min-w-[180px]">
                          {(() => {
                            const completed = Number(project['completed_task_count'] ?? 0)
                            const target = Number(project['target_task_count'] ?? 0)
                            const percent =
                              !target || target <= 0
                                ? 0
                                : Math.min(100, Math.round((completed / target) * 100))

                            return (
                              <div>
                                <div className="mb-1 text-xs text-zinc-600">{percent}%</div>
                                <div className="h-2 w-full rounded-full bg-zinc-200 overflow-hidden">
                                  <div
                                    className="h-2 rounded-full bg-black"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })()}
                        </td>
                        <td className="py-3 pr-4 text-zinc-700">
                          {String(project['target_task_count'] ?? '')}
                        </td>
                        <td className="py-3 pr-4 text-zinc-700">
                          <div className="flex items-center gap-2">
                            <select
                              value={statusDrafts[String(project['id'] ?? '')] ?? ''}
                              onChange={(e) =>
                                setStatusDrafts((prev) => ({
                                  ...prev,
                                  [String(project['id'] ?? '')]: e.target.value,
                                }))
                              }
                              className="w-40 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                            >
                              {projectStatusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(String(project['id'] ?? ''))}
                              disabled={updatingProjectId === String(project['id'] ?? '')}
                              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
                            >
                              {updatingProjectId === String(project['id'] ?? '') ? '저장 중...' : '저장'}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <a
                            href={`/admin/projects/${project['id']}`}
                            className="text-blue-600 underline"
                          >
                            상세보기
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}