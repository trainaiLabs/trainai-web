'use client'

import { useEffect, useState } from 'react'
import {
    AppSetting,
    getSystemSettings,
    updateSystemSetting,
} from '@/lib/admin/system-settings'

const LABELS: Record<string, string> = {
    recommended_app_version: '권장 앱 버전',
    minimum_app_version: '최소 앱 버전',
    recommended_app_build: '권장 앱 빌드번호',
    minimum_app_build: '최소 앱 빌드번호',
    play_store_url: '플레이스토어 주소',
}

const HELP_TEXT: Record<string, string> = {
    recommended_app_version: '화면 표시용 버전입니다. 예: 1.0.10',
    minimum_app_version: '화면 표시용 최소 버전입니다. 예: 1.0.9',
    recommended_app_build: '이 값보다 낮으면 업데이트 권장 팝업이 표시됩니다.',
    minimum_app_build: '이 값보다 낮으면 강제 업데이트 팝업이 표시됩니다.',
    play_store_url: '업데이트 버튼을 눌렀을 때 이동할 주소입니다.',
}

export default function SystemSettingsPage() {
    const [settings, setSettings] = useState<AppSetting[]>([])
    const [values, setValues] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [savingKey, setSavingKey] = useState<string | null>(null)

    useEffect(() => {
        loadSettings()
    }, [])

    async function loadSettings() {
        try {
            setLoading(true)
            const data = await getSystemSettings()
            setSettings(data)

            const nextValues: Record<string, string> = {}
            data.forEach((item) => {
                nextValues[item.setting_key] = item.setting_value ?? ''
            })
            setValues(nextValues)
        } catch (e) {
            console.error(e)
            alert('시스템 설정을 불러오지 못했습니다.')
        } finally {
            setLoading(false)
        }
    }

    async function handleSave(settingKey: string) {
        const value = values[settingKey]?.trim() ?? ''

        if (!value) {
            alert('값을 입력해주세요.')
            return
        }

        if (
            (settingKey === 'recommended_app_build' ||
                settingKey === 'minimum_app_build') &&
            !/^\d+$/.test(value)
        ) {
            alert('빌드번호는 숫자만 입력해주세요.')
            return
        }

        try {
            setSavingKey(settingKey)
            await updateSystemSetting(settingKey, value)
            alert('저장되었습니다.')
            await loadSettings()
        } catch (e) {
            console.error(e)
            alert('저장에 실패했습니다.')
        } finally {
            setSavingKey(null)
        }
    }

    if (loading) {
        return <p className="text-sm text-zinc-500">시스템 설정을 불러오는 중...</p>
    }

    return (
        <section className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">시스템 설정</h1>
                <p className="mt-1 text-sm text-zinc-500">
                    앱 버전, 강제 업데이트, 스토어 주소를 관리합니다.
                </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="space-y-4">
                    {settings.map((item) => (
                        <div
                            key={item.setting_key}
                            className="grid gap-3 border-b border-zinc-100 pb-4 last:border-b-0 last:pb-0 md:grid-cols-[220px_1fr_100px]"
                        >
                            <div>
                                <p className="font-medium">{LABELS[item.setting_key] ?? item.setting_key}</p>
                                <p className="mt-1 text-xs text-zinc-500">
                                    {HELP_TEXT[item.setting_key] ?? item.description}
                                </p>
                            </div>

                            <input
                                value={values[item.setting_key] ?? ''}
                                onChange={(e) =>
                                    setValues((prev) => ({
                                        ...prev,
                                        [item.setting_key]: e.target.value,
                                    }))
                                }
                                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                            />

                            <button
                                onClick={() => handleSave(item.setting_key)}
                                disabled={savingKey === item.setting_key}
                                className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                            >
                                {savingKey === item.setting_key ? '저장 중' : '저장'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}