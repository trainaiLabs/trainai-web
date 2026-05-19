'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase/client'
import { convertToCsv } from '@/lib/csv/convertToCsv'
import { downloadCsv } from '@/lib/csv/downloadCsv'
import { useRouter } from 'next/navigation'

type CsvRow = Record<string, string>

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const router = useRouter()

  const [project, setProject] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const [selectedFileName, setSelectedFileName] = useState('')
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])

  const [errorText, setErrorText] = useState('')
  const [successText, setSuccessText] = useState('')
  const [exportingType, setExportingType] = useState('')
  const [exportMessage, setExportMessage] = useState('')

  const loadProject = async () => {
    setLoading(true)

    const { data, error } = await supabase.rpc('admin_list_projects')

    if (error) {
      console.error(error)
      setProject(null)
      setLoading(false)
      return
    }

    const projectList = (data as Record<string, unknown>[]) ?? []
    const foundProject =
      projectList.find((item) => String(item['id'] ?? '') === projectId) ?? null

    setProject(foundProject)
    setLoading(false)
  }

  useEffect(() => {
    if (projectId) {
      loadProject()
    }
  }, [projectId])

  const normalizeHeader = (value: string) => {
    return value
      .replace(/\ufeff/g, '')
      .replace(/"/g, '')
      .trim()
      .toLowerCase()
  }

  const currentCriteria = String(project?.['evaluation_criteria'] ?? 'other')

  const internalHeaders = [
    'question_질문',
    'input_입력문',
    'answer_a_답변A',
    'answer_b_답변B',
    'choice_선택',
    'final_최종결과',
    'match_작업자일치여부',
    'confidence_최종판정신뢰도',
    'decision_source_결정출처',
    'decision_stage_결정단계',
    'admin_reviewed_at_관리자확정일시',
    'admin_review_note_관리자메모',
    'email_이메일',
    'worker_id_작업자ID',
    'submitted_at_제출일시',
    'task_id_작업ID',
  ]

  const deliveryHeaders = [
    'question_질문',
    'input_입력문',
    'answer_a_답변A',
    'answer_b_답변B',
    'final_최종결과',
    'confidence_최종판정신뢰도',
    'decision_source_결정출처',
    'decision_stage_결정단계',
    'admin_reviewed_at_관리자확정일시',
    'admin_review_note_관리자메모',
    'a_count_A선택수',
    'b_count_B선택수',
    'tie_count_동률수',
    'skip_count_건너뜀수',
    'total_총응답수',
    'updated_at_최종갱신시각',
  ]

  const deliveryRawHeaders = [
    'question_질문',
    'input_입력문',
    'answer_a_답변A',
    'answer_b_답변B',
    'choice_선택',
    'final_최종결과',
    'match_일치여부',
    'confidence_신뢰도',
    'decision_source_결정출처',
    'decision_stage_결정단계',
    'admin_reviewed_at_관리자확정일시',
    'admin_review_note_관리자메모',
    'submitted_at_제출일시',
  ]

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

  const handleUpload = async () => {
    if (!project) return

    if (parsedRows.length === 0) {
      setErrorText('먼저 CSV 파일을 선택해 주세요.')
      return
    }

    setUploading(true)
    setErrorText('')
    setSuccessText('')

    const taskType = String(project['task_type'] ?? '')
    const evaluationCriteria = String(project['evaluation_criteria'] ?? 'other')
    const rewardPoints = Number(project['reward_per_task'] ?? 0)

    const { data, error } = await supabase.rpc('admin_insert_preference_tasks', {
      p_project_id: projectId,
      p_rows: parsedRows,
      p_task_type: taskType,
      p_task_category: taskType,
      p_reward_points: rewardPoints,
      p_evaluation_criteria: evaluationCriteria,
    })

    if (error) {
      setErrorText(`업로드 실패: ${error.message}`)
      setUploading(false)
      return
    }

    const result = data as {
      success?: boolean
      inserted_count?: number
      skipped_count?: number
      db_skipped_count?: number
      file_duplicate_count?: number
      empty_skipped_count?: number
      target_task_count?: number
    }

    const insertedCount = Number(result?.inserted_count ?? 0)
    const skippedCount = Number(result?.skipped_count ?? 0)

    const dbSkippedCount = Number(result?.db_skipped_count ?? 0)

    const fileDuplicateCount = Number(
      result?.file_duplicate_count ?? 0
    )

    const emptySkippedCount = Number(
      result?.empty_skipped_count ?? 0
    )

    const targetTaskCount = Number(
      result?.target_task_count ?? 0
    )

    setSuccessText(
      [
        'CSV 업로드 완료',
        '',
        `등록 완료: ${insertedCount}개`,
        `기존 DB 중복 제외: ${dbSkippedCount}개`,
        `업로드 파일 중복 제외: ${fileDuplicateCount}개`,
        `빈 질문 제외: ${emptySkippedCount}개`,
        '',
        `현재 프로젝트 총 퀘스트: ${targetTaskCount}개`,
      ].join('\n')
    )

    await loadProject()

    setSelectedFileName('')
    setParsedRows([])
    setHeaders([])
    setUploading(false)
  }

  const buildSafeFileTitle = (suffix: string) => {
    const rawTitle = String(project?.['title'] ?? 'project_results')

    const safeTitle = rawTitle
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/ /g, '_')

    return `${safeTitle}_${projectId}_${suffix}`
  }

  const downloadJsonl = (jsonlText: string, fileName: string) => {
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + jsonlText], {
      type: 'application/x-ndjson;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  const mapDeliveryRowsToKorean = (rows: Record<string, any>[]) => {
    return rows.map((row) => ({
      프로젝트명: row['project_title'],
      작업ID: row['task_id'],
      질문: row['prompt_text'],
      평가기준: row['template_type'],
      답변A: row['answer_a_답변A'],
      답변B: row['answer_b_답변B'],
      최종합의결과: row['consensus_label'],
      우세후보ID: row['winning_candidate_id'],
      총응답수: row['total_responses'],
      A선택수: row['a_count'],
      B선택수: row['b_count'],
      동률수: row['tie_count'],
      건너뜀수: row['skip_count'],
      불명확수: row['unclear_count'],
      '초기 응답 일치도(%)': row['agreement_rate_percent'],
      재검토필요: row['needs_rework'],
      골드검토필요: row['gold_review_required'],
      최종갱신시각: row['updated_at'],
    }))
  }

  const mapDeliveryRawRowsToKorean = (rows: Record<string, any>[]) => {
    return rows.map((row) => ({
      프로젝트명: row['project_title'],
      작업ID: row['task_id'],
      질문: row['prompt_text'],
      평가기준: row['template_type'],
      답변A: row['answer_a_답변A'],
      답변B: row['answer_b_답변B'],
      응답ID: row['response_id'],
      작업자ID: row['user_id'],
      배정ID: row['assignment_id'],
      작업자선택: row['selected_label'],
      선택후보ID: row['selected_candidate_id'],
      최종합의결과: row['consensus_label'],
      우세후보ID: row['winning_candidate_id'],
      '초기 응답 일치도(%)': row['agreement_rate_percent'],
      재검토필요: row['needs_rework'],
      골드검토필요: row['gold_review_required'],
      응답시각: row['responded_at'],
    }))
  }

  const mapPreferenceRowsToJsonlObjects = (rows: Record<string, any>[]) => {
    return rows.map((row) => ({
      instruction: row['instruction'] ?? '',
      input_text: row['input_text'] ?? '',
      criteria: row['criteria'] ?? 'other',
      chosen: row['chosen'] ?? '',
      rejected: row['rejected'] ?? '',
    }))
  }

  const criteriaLabelForPrompt = (criteria: string) => {
    switch (criteria) {
      case 'naturalness':
        return 'naturalness'
      case 'accuracy':
        return 'accuracy'
      case 'helpfulness':
        return 'helpfulness'
      case 'politeness':
        return 'politeness'
      case 'safety':
        return 'safety'
      default:
        return 'other'
    }
  }

  const buildTrainingPrompt = (row: Record<string, any>) => {
    const instruction = String(row['instruction'] ?? '').trim()
    const inputText = String(row['input_text'] ?? '').trim()
    const criteria = criteriaLabelForPrompt(String(row['criteria'] ?? 'other').trim())

    if (!inputText) {
      return `[${criteria}]\n${instruction}`
    }

    return `[${criteria}]\n${instruction}\n\n질문: ${inputText}`
  }

  const mapPreferenceRowsToTrainingJsonlObjects = (rows: Record<string, any>[]) => {
    return rows.map((row) => ({
      prompt: buildTrainingPrompt(row),
      chosen: row['chosen'] ?? '',
      rejected: row['rejected'] ?? '',
    }))
  }

  const handleExport = async (
    type:
      | 'internal'
      | 'delivery'
      | 'deliveryRaw'
      | 'preferenceJsonl'
      | 'preferenceTrainJsonl'
  ) => {
    setExportingType(type)
    setExportMessage('')
    setErrorText('')
    setSuccessText('')

    try {
      if (type === 'internal') {
        const { data, error } = await supabase.rpc(
          'admin_export_project_results_internal',
          { p_project_id: projectId }
        )

        if (error) {
          setExportMessage(`Export 실패: ${error.message}`)
          setExportingType('')
          return
        }

        const rows = (data as Record<string, any>[]) ?? []

        if (!rows.length) {
          setExportMessage('내보낼 데이터가 없습니다.')
          setExportingType('')
          return
        }

        const csv = convertToCsv(rows, internalHeaders)
        downloadCsv(csv, `${buildSafeFileTitle('internal')}.csv`)
        setExportMessage(`${rows.length}개 행을 내보냈습니다.`)
        setExportingType('')
        return
      }

      if (type === 'delivery') {
        const { data, error } = await supabase.rpc(
          'admin_export_project_results_delivery',
          { p_project_id: projectId }
        )

        if (error) {
          setExportMessage(`Export 실패: ${error.message}`)
          setExportingType('')
          return
        }

        const rows = (data as Record<string, any>[]) ?? []

        if (!rows.length) {
          setExportMessage('내보낼 데이터가 없습니다.')
          setExportingType('')
          return
        }

        const csv = convertToCsv(rows, deliveryHeaders)
        downloadCsv(csv, `${buildSafeFileTitle('delivery_summary')}.csv`)
        setExportMessage(`${rows.length}개 행을 내보냈습니다.`)
        setExportingType('')
        return
      }

      if (type === 'deliveryRaw') {
        const { data, error } = await supabase.rpc(
          'admin_export_project_results_delivery_raw',
          { p_project_id: projectId }
        )

        if (error) {
          setExportMessage(`Export 실패: ${error.message}`)
          setExportingType('')
          return
        }

        const rows = (data as Record<string, any>[]) ?? []

        if (!rows.length) {
          setExportMessage('내보낼 데이터가 없습니다.')
          setExportingType('')
          return
        }

        const csv = convertToCsv(rows, deliveryRawHeaders)
        downloadCsv(csv, `${buildSafeFileTitle('delivery_raw')}.csv`)
        setExportMessage(`${rows.length}개 행을 내보냈습니다.`)
        setExportingType('')
        return
      }

      if (type === 'preferenceJsonl') {
        const { data, error } = await supabase.rpc(
          'admin_export_preference_dataset',
          { p_project_id: projectId }
        )

        if (error) {
          setExportMessage(`Export 실패: ${error.message}`)
          setExportingType('')
          return
        }

        const rows = (data as Record<string, any>[]) ?? []

        if (!rows.length) {
          setExportMessage('내보낼 데이터가 없습니다.')
          setExportingType('')
          return
        }

        const jsonlObjects = mapPreferenceRowsToJsonlObjects(rows)
        const jsonlText = jsonlObjects.map((row) => JSON.stringify(row)).join('\n')

        downloadJsonl(
          jsonlText,
          `${buildSafeFileTitle('preference_dataset')}.jsonl`
        )

        setExportMessage(`${rows.length}개 행을 내보냈습니다.`)
        setExportingType('')
        return
      }

      if (type === 'preferenceTrainJsonl') {
        const { data, error } = await supabase.rpc(
          'admin_export_preference_dataset',
          { p_project_id: projectId }
        )

        if (error) {
          setExportMessage(`Export 실패: ${error.message}`)
          setExportingType('')
          return
        }

        const rows = (data as Record<string, any>[]) ?? []

        if (!rows.length) {
          setExportMessage('내보낼 데이터가 없습니다.')
          setExportingType('')
          return
        }

        const jsonlObjects = mapPreferenceRowsToTrainingJsonlObjects(rows)
        const jsonlText = jsonlObjects.map((row) => JSON.stringify(row)).join('\n')

        downloadJsonl(
          jsonlText,
          `${buildSafeFileTitle('preference_training')}.jsonl`
        )

        setExportMessage(`${rows.length}개 행을 내보냈습니다.`)
        setExportingType('')
        return
      }
    } catch (e) {
      setExportMessage(
        `Export 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`
      )
      setExportingType('')
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <p className="text-zinc-600">불러오는 중...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="max-w-3xl">
        <p className="text-red-600">프로젝트를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <button
          type="button"
          onClick={() => router.push('/admin/projects')}
          className="mb-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          ← 프로젝트 목록으로
        </button>
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">프로젝트 상세</h1>
        <p className="text-zinc-600">
          기존 프로젝트에 CSV를 추가 업로드할 수 있습니다.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900 mb-4">프로젝트 정보</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-zinc-500">제목</div>
            <div className="font-medium text-zinc-900">
              {String(project['title'] ?? '')}
            </div>
          </div>

          <div>
            <div className="text-zinc-500">상태</div>
            <div className="font-medium text-zinc-900">
              {String(project['status'] ?? '')}
            </div>
          </div>

          <div>
            <div className="text-zinc-500">프로젝트 유형</div>
            <div className="font-medium text-zinc-900">
              {String(project['project_kind'] ?? '')}
            </div>
          </div>

          <div>
            <div className="text-zinc-500">task 유형</div>
            <div className="font-medium text-zinc-900">
              {String(project['task_type'] ?? '')}
            </div>
          </div>

          <div>
            <div className="text-zinc-500">평가 기준</div>
            <div className="font-medium text-zinc-900">
              {String(project['evaluation_criteria'] ?? '')}
            </div>
          </div>

          <div>
            <div className="text-zinc-500">보상 포인트</div>
            <div className="font-medium text-zinc-900">
              {String(project['reward_per_task'] ?? '')}
            </div>
          </div>

          <div>
            <div className="text-zinc-500">목표 task 수</div>
            <div className="font-medium text-zinc-900">
              {String(project['target_task_count'] ?? '')}
            </div>
          </div>
        </div>
        <div>
          <div className="text-zinc-500">현재 task 수</div>
          <div className="font-medium text-zinc-900">
            {String(project['completed_task_count'] ?? 0)}
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          자동 적용 문구: <span className="font-medium">{instructionText}</span>
        </div>
        <div className="mt-4">
          {(() => {
            const completed = Number(project['completed_task_count'] ?? 0)
            const target = Number(project['target_task_count'] ?? 0)
            const percent =
              !target || target <= 0
                ? 0
                : Math.min(100, Math.round((completed / target) * 100))

            return (
              <div>
                <div className="mb-2 text-sm text-zinc-600">
                  진행률: <span className="font-medium text-zinc-900">{percent}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-zinc-200 overflow-hidden">
                  <div
                    className="h-3 rounded-full bg-black"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })()}
        </div>

      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900 mb-4">CSV 추가 업로드</h2>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            CSV 파일 업로드
          </label>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-8 text-center transition hover:border-black hover:bg-zinc-100">
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvFile}
              className="hidden"
            />

            <div className="text-sm font-medium text-zinc-800">CSV 파일 선택</div>
            <div className="mt-1 text-xs text-zinc-500">클릭해서 업로드</div>

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

        {headers.length > 0 && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            <div className="text-xs text-zinc-500">헤더</div>
            <div>{headers.join(', ')}</div>
            <div className="mt-2 text-xs text-zinc-500">
              파싱된 행 수: {parsedRows.length}
            </div>
          </div>
        )}

        {errorText && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorText}
          </div>
        )}

        {successText && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successText}
          </div>
        )}

        <div className="mt-5">
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="rounded-xl bg-black px-5 py-3 text-white font-medium hover:bg-zinc-800 disabled:opacity-60"
          >
            {uploading ? '업로드 중...' : '이 프로젝트에 CSV 추가 업로드'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900 mb-4">데이터 Export</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleExport('internal')}
            disabled={exportingType !== ''}
            className="rounded-xl bg-indigo-700 text-white px-4 py-3 text-sm font-medium hover:bg-indigo-800 disabled:opacity-60"
          >
            {exportingType === 'internal' ? '다운로드 중...' : '내부 운영용 CSV'}
          </button>

          <button
            type="button"
            onClick={() => handleExport('delivery')}
            disabled={exportingType !== ''}
            className="rounded-xl border border-zinc-400 px-4 py-3 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
          >
            {exportingType === 'delivery' ? '다운로드 중...' : '기업 납품용 CSV (집계형)'}
          </button>

          <button
            type="button"
            onClick={() => handleExport('deliveryRaw')}
            disabled={exportingType !== ''}
            className="rounded-xl border border-zinc-400 px-4 py-3 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
          >
            {exportingType === 'deliveryRaw' ? '다운로드 중...' : '기업 납품용 CSV (원본응답형)'}
          </button>

          <button
            type="button"
            onClick={() => handleExport('preferenceJsonl')}
            disabled={exportingType !== ''}
            className="rounded-xl border border-zinc-400 px-4 py-3 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
          >
            {exportingType === 'preferenceJsonl' ? '다운로드 중...' : 'Preference JSONL 다운로드'}
          </button>

          <button
            type="button"
            onClick={() => handleExport('preferenceTrainJsonl')}
            disabled={exportingType !== ''}
            className="rounded-xl border border-zinc-400 px-4 py-3 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60 md:col-span-2"
          >
            {exportingType === 'preferenceTrainJsonl'
              ? '다운로드 중...'
              : '학습용 Preference JSONL 다운로드'}
          </button>
        </div>

        {exportMessage && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            {exportMessage}
          </div>
        )}
      </div>
    </div>
  )
}