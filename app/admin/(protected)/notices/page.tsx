'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AdminNotice,
  adminDeleteNotice,
  adminListNotices,
  adminUpsertNotice,
  uploadNoticeImage,
} from '@/lib/admin/notices'

type NoticeFormState = {
  id: string | null
  title: string
  body: string
  image_url: string
  is_active: boolean
  is_popup: boolean
  start_at: string
  end_at: string
  priority: number
}

const initialForm: NoticeFormState = {
  id: null,
  title: '',
  body: '',
  image_url: '',
  is_active: true,
  is_popup: true,
  start_at: '',
  end_at: '',
  priority: 1,
}

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function toKoreanDisplay(value: string | null | undefined) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('ko-KR')
}

function loadImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
      URL.revokeObjectURL(objectUrl)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('이미지 파일을 읽을 수 없습니다.'))
    }

    img.src = objectUrl
  })
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<AdminNotice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<NoticeFormState>(initialForm)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [selectedImagePreview, setSelectedImagePreview] = useState<string>('')

  async function fetchNotices() {
    try {
      setLoading(true)
      setError(null)
      const data = await adminListNotices()
      setNotices(data)
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '공지 목록을 불러오지 못했습니다.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotices()
  }, [])

  useEffect(() => {
    return () => {
      if (selectedImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImagePreview)
      }
    }
  }, [selectedImagePreview])

  function resetForm() {
    if (selectedImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImagePreview)
    }

    setForm(initialForm)
    setSelectedImageFile(null)
    setSelectedImagePreview('')
  }

  function handleEdit(notice: AdminNotice) {
    if (selectedImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImagePreview)
    }

    setForm({
      id: notice.id,
      title: notice.title ?? '',
      body: notice.body ?? '',
      image_url: notice.image_url ?? '',
      is_active: notice.is_active ?? true,
      is_popup: notice.is_popup ?? true,
      start_at: toDatetimeLocal(notice.start_at),
      end_at: toDatetimeLocal(notice.end_at),
      priority: Number.isFinite(notice.priority) ? notice.priority : 1,
    })

    setSelectedImageFile(null)
    setSelectedImagePreview('')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function validateForm() {
    const title = form.title.trim()
    const body = form.body.trim()

    if (!title) return '제목을 입력해주세요.'
    if (!body) return '내용을 입력해주세요.'
    if (!Number.isInteger(form.priority) || form.priority < 1) {
      return '우선순위는 1 이상의 정수여야 합니다.'
    }

    if (form.start_at && form.end_at) {
      const start = new Date(form.start_at)
      const end = new Date(form.end_at)

      if (start.getTime() > end.getTime()) {
        return '종료일은 시작일보다 빠를 수 없습니다.'
      }
    }

    return null
  }

  async function handleImageChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0]
    e.target.value = ''

    if (!file) return

    if (!file.type.startsWith('image/')) {
      window.alert('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    if (file.size > 1024 * 1024) {
      window.alert('이미지 용량이 너무 큽니다. 최대 1MB 이하만 업로드할 수 있습니다.')
      return
    }

    try {
      const { width, height } = await loadImageSize(file)
      const ratio = width / height
      const targetRatio = 16 / 9
      const ratioDiff = Math.abs(ratio - targetRatio)

      if (width < 700 || height < 350) {
        window.alert('이미지 해상도가 너무 작습니다. 권장 크기는 800x450 이상입니다.')
        return
      }

      if (ratioDiff > 0.15) {
        window.alert(
          '이미지 비율이 맞지 않습니다. 16:9 비율 이미지를 사용해주세요. 권장 크기: 800x450',
        )
        return
      }

      if (selectedImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(selectedImagePreview)
      }

      const previewUrl = URL.createObjectURL(file)
      setSelectedImageFile(file)
      setSelectedImagePreview(previewUrl)
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '이미지 파일을 확인할 수 없습니다.'
      window.alert(message)
    }
  }

  function removeSelectedImage() {
    if (selectedImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImagePreview)
    }

    setSelectedImageFile(null)
    setSelectedImagePreview('')
  }

  function removeExistingImage() {
    if (selectedImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(selectedImagePreview)
    }

    setSelectedImageFile(null)
    setSelectedImagePreview('')
    setForm((prev) => ({ ...prev, image_url: '' }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      window.alert(validationError)
      return
    }

    try {
      setSaving(true)
      setUploadingImage(false)
      setError(null)

      let finalImageUrl: string | null = form.image_url.trim() || null

      if (selectedImageFile) {
        setUploadingImage(true)
        finalImageUrl = await uploadNoticeImage(selectedImageFile)
        setUploadingImage(false)
      }

      await adminUpsertNotice({
        id: form.id,
        title: form.title.trim(),
        body: form.body.trim(),
        imageUrl: finalImageUrl,
        isActive: form.is_active,
        isPopup: form.is_popup,
        startAt: form.start_at ? new Date(form.start_at).toISOString() : null,
        endAt: form.end_at ? new Date(form.end_at).toISOString() : null,
        priority: form.priority,
      })

      const wasEdit = Boolean(form.id)
      resetForm()
      await fetchNotices()

      window.alert(wasEdit ? '공지가 수정되었습니다.' : '공지가 등록되었습니다.')
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '공지 저장에 실패했습니다.'
      setError(message)
    } finally {
      setSaving(false)
      setUploadingImage(false)
    }
  }

  async function handleDelete(notice: AdminNotice) {
    const ok = window.confirm(`정말 "${notice.title}" 공지를 삭제할까요?`)
    if (!ok) return

    try {
      setDeletingId(notice.id)
      setError(null)

      await adminDeleteNotice(notice.id)

      if (form.id === notice.id) {
        resetForm()
      }

      await fetchNotices()
      window.alert('공지가 삭제되었습니다.')
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '공지 삭제에 실패했습니다.'
      setError(message)
    } finally {
      setDeletingId(null)
    }
  }

  const sortedNotices = useMemo(() => {
    return [...notices].sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }

      const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0
      const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0

      return bCreated - aCreated
    })
  }, [notices])

  const previewImageUrl = selectedImagePreview || form.image_url

  return (
  <div className="p-6">
    <div className="max-w-5xl space-y-6">

      {/* 제목 */}
      <div>
        <h1 className="text-2xl font-bold">공지 관리</h1>
        <p className="mt-1 text-sm text-gray-500">
          공지 등록, 수정, 삭제 및 노출 조건을 관리합니다.
        </p>
      </div>

      {/* 에러 */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ================== 공지 작성 ================== */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {form.id ? '공지 수정' : '새 공지 등록'}
          </h2>

          {form.id && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              수정 취소
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* 제목 */}
          <div>
            <label className="mb-1 block text-sm font-medium">제목</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>

          {/* 내용 */}
          <div>
            <label className="mb-1 block text-sm font-medium">내용</label>
            <textarea
              value={form.body}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, body: e.target.value }))
              }
              className="min-h-[160px] w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>

          {/* 이미지 */}
          <div>
            <label className="mb-2 block text-sm font-medium">공지 이미지</label>

            <div className="rounded-xl border border-dashed border-zinc-300 p-4">
              <label className="inline-flex cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-sm">
                이미지 선택
                <input
                  type="file"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>

              <p className="mt-2 text-xs text-gray-500">
                권장: 800x450 이상 / 16:9 / 최대 1MB
              </p>
            </div>
          </div>

          {/* 이미지 미리보기 */}
          {previewImageUrl && (
            <div className="overflow-hidden rounded-xl border border-zinc-200">
              <img
                src={previewImageUrl}
                className="max-h-[260px] w-full object-cover"
              />
            </div>
          )}

          {/* 날짜 */}
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="datetime-local"
              value={form.start_at}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, start_at: e.target.value }))
              }
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />

            <input
              type="datetime-local"
              value={form.end_at}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, end_at: e.target.value }))
              }
              className="rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>

          {/* 우선순위 */}
          <input
            type="number"
            value={form.priority}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                priority: Number(e.target.value),
              }))
            }
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />

          {/* 옵션 */}
          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
              />
              활성
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_popup}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    is_popup: e.target.checked,
                  }))
                }
              />
              팝업
            </label>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-black px-4 py-2 text-white"
            >
              {form.id ? '수정 저장' : '공지 등록'}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-zinc-200 px-4 py-2"
            >
              초기화
            </button>
          </div>
        </form>
      </section>

      {/* ================== 공지 목록 ================== */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">공지 목록</h2>

        {sortedNotices.map((notice) => (
          <div
            key={notice.id}
            className="mb-4 rounded-xl border border-zinc-200 bg-white p-4"
          >
            <div className="flex justify-between">
              <h3 className="font-semibold">{notice.title}</h3>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(notice)}
                  className="rounded-lg border border-zinc-200 px-3 py-1 text-sm"
                >
                  수정
                </button>

                <button
                  onClick={() => handleDelete(notice)}
                  className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600"
                >
                  삭제
                </button>
              </div>
            </div>

            <div className="mt-2 flex gap-2 text-xs">
              <span className="border border-zinc-200 px-2 py-1 rounded">
                {notice.is_active ? '활성' : '비활성'}
              </span>
              <span className="border border-zinc-200 px-2 py-1 rounded">
                {notice.is_popup ? '팝업' : '일반'}
              </span>
              <span className="border border-zinc-200 px-2 py-1 rounded">
                {notice.priority}
              </span>
            </div>

            {notice.image_url && (
              <img
                src={notice.image_url}
                className="mt-3 rounded-lg border border-zinc-200"
              />
            )}

            <p className="mt-3 text-sm">{notice.body}</p>
          </div>
        ))}
      </section>

    </div>
  </div>
)
}