import { supabase } from '@/lib/supabase/client'

export type AdminNotice = {
  id: string
  title: string
  body: string
  image_url: string | null
  is_active: boolean
  is_popup: boolean
  start_at: string | null
  end_at: string | null
  priority: number
  created_at: string | null
  updated_at: string | null
}

export type AdminUpsertNoticeParams = {
  id?: string | null
  title: string
  body: string
  imageUrl?: string | null
  isActive: boolean
  isPopup: boolean
  startAt?: string | null
  endAt?: string | null
  priority: number
}

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim()

  const dotIndex = trimmed.lastIndexOf('.')
  let name = dotIndex >= 0 ? trimmed.slice(0, dotIndex) : trimmed
  let ext = dotIndex >= 0 ? trimmed.slice(dotIndex).toLowerCase() : ''

  name = name
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')

  if (!name) {
    name = 'notice_image'
  }

  if (!ext || !/^\.[a-z0-9]+$/.test(ext)) {
    ext = '.png'
  }

  return `${name}${ext}`
}

export async function adminListNotices(): Promise<AdminNotice[]> {
  const { data, error } = await supabase.rpc('admin_list_notices')

  if (error) throw error
  if (!data) return []

  return data as AdminNotice[]
}

export async function adminUpsertNotice(params: AdminUpsertNoticeParams) {
  const { data, error } = await supabase.rpc('admin_upsert_notice', {
    p_notice_id: params.id ?? null,
    p_title: params.title,
    p_body: params.body,
    p_image_url: params.imageUrl ?? null,
    p_is_active: params.isActive,
    p_is_popup: params.isPopup,
    p_start_at: params.startAt ?? null,
    p_end_at: params.endAt ?? null,
    p_priority: params.priority,
  })

  if (error) throw error
  return data as { success: boolean; notice_id: string }
}

export async function adminDeleteNotice(noticeId: string) {
  const { data, error } = await supabase.rpc('admin_delete_notice', {
    p_notice_id: noticeId,
  })

  if (error) throw error
  return data as { success: boolean; notice_id: string }
}

export async function uploadNoticeImage(file: File) {
  const safeFileName = sanitizeFileName(file.name)
  const filePath = `notices/${Date.now()}_${safeFileName}`

  const { error: uploadError } = await supabase.storage
    .from('notice-images')
    .upload(filePath, file, {
      upsert: true,
    })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('notice-images').getPublicUrl(filePath)

  return data.publicUrl
}