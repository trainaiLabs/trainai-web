import { supabase } from '@/lib/supabase/client'

export type MonetizationSettings = {
  id: string
  ads_enabled: boolean
  rewarded_quest_enabled: boolean
  test_mode: boolean
  fallback_button_enabled: boolean
  default_ad_provider: string
  updated_at?: string
}

export async function getMonetizationSettings() {
  const { data, error } = await supabase.rpc(
    'admin_get_monetization_settings'
  )

  if (error) throw error
  return data
}

export async function updateMonetizationSettings(payload: Partial<MonetizationSettings>) {
  const { error } = await supabase
    .from('monetization_settings')
    .update(payload)
    .eq('id', payload.id)

  if (error) throw error
}

export type AdUnlockLog = {
  id: string
  user_id: string
  email: string | null
  nickname: string | null
  unlock_type: string | null
  rewarded_ad_network: string | null
  reward_policy_key: string | null
  unlocked_at: string | null
  unlock_date: string | null
  is_consumed: boolean
  consumed_at: string | null
  ad_status: string | null
  placement_id: string | null
  metadata: Record<string, unknown> | null
}

export async function getAdLogs(): Promise<AdUnlockLog[]> {
  const { data, error } = await supabase.rpc('admin_get_ad_unlock_logs', {
    p_limit: 100,
  })

  if (error) throw error
  return (data ?? []) as AdUnlockLog[]
}

export type AdPlacement = {
  id: string
  placement_key: string
  name: string
  provider: 'admob' | 'coupang' | 'naver' | 'custom' | 'fake'
  ad_type: 'rewarded' | 'banner' | 'external_link' | 'webview'
  is_active: boolean
  test_mode: boolean
  android_ad_unit_id: string | null
  ios_ad_unit_id: string | null
  image_url: string | null
  click_url: string | null
  webview_url: string | null
  title: string | null
  description: string | null
  button_text: string | null
  priority: number
  created_at: string | null
  updated_at: string | null
  updated_by: string | null
}

export async function getAdPlacements(): Promise<AdPlacement[]> {
  const { data, error } = await supabase.rpc('admin_list_ad_placements')

  if (error) throw error
  return (data ?? []) as AdPlacement[]
}

export async function upsertAdPlacement(params: {
  id?: string | null
  placementKey: string
  name: string
  provider: AdPlacement['provider']
  adType: AdPlacement['ad_type']
  isActive: boolean
  testMode: boolean
  androidAdUnitId?: string | null
  iosAdUnitId?: string | null
  imageUrl?: string | null
  clickUrl?: string | null
  webviewUrl?: string | null
  title?: string | null
  description?: string | null
  buttonText?: string | null
  priority: number
}) {
  const { data, error } = await supabase.rpc('admin_upsert_ad_placement', {
    p_id: params.id ?? null,
    p_placement_key: params.placementKey,
    p_name: params.name,
    p_provider: params.provider,
    p_ad_type: params.adType,
    p_is_active: params.isActive,
    p_test_mode: params.testMode,
    p_android_ad_unit_id: params.androidAdUnitId ?? null,
    p_ios_ad_unit_id: params.iosAdUnitId ?? null,
    p_image_url: params.imageUrl ?? null,
    p_click_url: params.clickUrl ?? null,
    p_webview_url: params.webviewUrl ?? null,
    p_title: params.title ?? null,
    p_description: params.description ?? null,
    p_button_text: params.buttonText ?? null,
    p_priority: params.priority,
  })

  if (error) throw error
  return data
}

export async function setAdPlacementActive(id: string, isActive: boolean) {
  const { data, error } = await supabase.rpc('admin_set_ad_placement_active', {
    p_id: id,
    p_is_active: isActive,
  })

  if (error) throw error
  return data
}