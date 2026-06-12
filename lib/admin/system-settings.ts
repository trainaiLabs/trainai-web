import { supabase } from '@/lib/supabase/client'

export type AppSetting = {
    setting_key: string
    setting_value: string
    description: string | null
}

const SYSTEM_SETTING_KEYS = [
    'recommended_app_version',
    'minimum_app_version',
    'recommended_app_build',
    'minimum_app_build',
    'play_store_url',
]

export async function getSystemSettings(): Promise<AppSetting[]> {
    const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value, description')
        .in('setting_key', SYSTEM_SETTING_KEYS)
        .order('setting_key', { ascending: true })

    if (error) throw error
    return (data ?? []) as AppSetting[]
}

export async function updateSystemSetting(
    settingKey: string,
    settingValue: string
) {
    const { error } = await supabase
        .from('app_settings')
        .update({ setting_value: settingValue })
        .eq('setting_key', settingKey)

    if (error) throw error
}