'use client'

import { useState } from 'react'
import { supabase } from '../../../../lib/supabase/client'

type MaterialCsvRow = {
    name: string
    category: string
    memo?: string
}

type EventCsvRow = {
    name: string
    description?: string
}

function downloadTextFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()

    URL.revokeObjectURL(url)
}

function toCsv(rows: Record<string, any>[], headers: string[]) {
    const lines = [
        headers.join(','),
        ...rows.map((row) =>
            headers.map((h) => String(row[h] ?? '').replaceAll(',', ' ')).join(',')
        ),
    ]

    return '\uFEFF' + lines.join('\n')
}

function parseCsv(text: string) {
    const clean = text.replace(/^\uFEFF/, '').trim()
    if (!clean) return []

    const lines = clean.split(/\r?\n/).filter(Boolean)
    const headers = lines[0].split(',').map((h) => h.trim())

    return lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim())
        const row: Record<string, string> = {}

        headers.forEach((h, i) => {
            row[h] = values[i] ?? ''
        })

        return row
    })
}

export default function QuestGeneratorPage() {
    const [loading, setLoading] = useState(false)

    async function downloadMaterials() {
        setLoading(true)

        const { data, error } = await supabase
            .from('quest_generator_materials')
            .select('name, category, memo, usage_count, is_active, created_at')
            .order('created_at', { ascending: false })

        setLoading(false)

        if (error) {
            alert('소재 다운로드 실패: ' + error.message)
            return
        }

        downloadTextFile(
            'quest_materials.csv',
            toCsv(data ?? [], [
                'name',
                'category',
                'memo',
                'usage_count',
                'is_active',
                'created_at',
            ])
        )
    }

    async function downloadEvents() {
        setLoading(true)

        const { data, error } = await supabase
            .from('quest_generator_events')
            .select('name, description, is_active, created_at')
            .order('created_at', { ascending: false })

        setLoading(false)

        if (error) {
            alert('사건 다운로드 실패: ' + error.message)
            return
        }

        downloadTextFile(
            'quest_events.csv',
            toCsv(data ?? [], ['name', 'description', 'is_active', 'created_at'])
        )
    }

    async function uploadMaterials(file: File) {
        const text = await file.text()
        const rows = parseCsv(text) as MaterialCsvRow[]

        const validRows = rows
            .map((row) => ({
                name: row.name?.trim(),
                category: row.category?.trim() || '기타',
                memo: row.memo?.trim() || null,
            }))
            .filter((row) => row.name)

        if (validRows.length === 0) {
            alert('업로드할 소재가 없습니다. CSV 헤더는 name,category,memo 입니다.')
            return
        }

        setLoading(true)

        const { data: existing } = await supabase
            .from('quest_generator_materials')
            .select('name')

        const existingSet = new Set(
            (existing ?? []).map((item) => item.name.trim())
        )

        const insertRows = validRows.filter((row) => !existingSet.has(row.name))

        if (insertRows.length === 0) {
            setLoading(false)
            alert('새로 등록할 소재가 없습니다.')
            return
        }

        const { error } = await supabase
            .from('quest_generator_materials')
            .insert(insertRows)

        setLoading(false)

        if (error) {
            alert('소재 업로드 실패: ' + error.message)
            return
        }

        alert(`${insertRows.length}개 소재를 등록했습니다.`)
    }

    async function uploadEvents(file: File) {
        const text = await file.text()
        const rows = parseCsv(text) as EventCsvRow[]

        const validRows = rows
            .map((row) => ({
                name: row.name?.trim(),
                description: row.description?.trim() || null,
            }))
            .filter((row) => row.name)

        if (validRows.length === 0) {
            alert('업로드할 사건이 없습니다. CSV 헤더는 name,description 입니다.')
            return
        }

        setLoading(true)

        const { data: existing } = await supabase
            .from('quest_generator_events')
            .select('name')

        const existingSet = new Set(
            (existing ?? []).map((item) => item.name.trim())
        )

        const insertRows = validRows.filter((row) => !existingSet.has(row.name))

        if (insertRows.length === 0) {
            setLoading(false)
            alert('새로 등록할 사건 유형이 없습니다.')
            return
        }

        const { error } = await supabase
            .from('quest_generator_events')
            .insert(insertRows)

        setLoading(false)

        if (error) {
            alert('사건 업로드 실패: ' + error.message)
            return
        }

        alert(`${insertRows.length}개 사건 유형을 등록했습니다.`)
    }

    function downloadMaterialSample() {
        downloadTextFile(
            'quest_materials_sample.csv',
            '\uFEFFname,category,memo\n오래된 라디오,추억,소리 추억 소재\n낡은 우체통,장소,동네 미스터리 소재'
        )
    }

    function downloadEventSample() {
        downloadTextFile(
            'quest_events_sample.csv',
            '\uFEFFname,description\n발견,무언가를 발견하거나 주운 상황\n수신,편지 쪽지 알림 택배 등을 받는 상황'
        )
    }

    return (
        <div className="max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold">퀘스트 생성기</h1>
                <p className="mt-2 text-sm text-zinc-500">
                    소재와 사건 유형을 CSV 파일로 내려받고 업로드합니다.
                </p>
            </div>

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">소재 관리</h2>
                <p className="mt-1 text-sm text-zinc-500">
                    업로드 CSV 헤더: name, category, memo
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        onClick={downloadMaterials}
                        disabled={loading}
                        className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                        소재 다운로드
                    </button>

                    <button
                        onClick={downloadMaterialSample}
                        className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50"
                    >
                        소재 샘플 다운로드
                    </button>

                    <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50">
                        소재 업로드
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) uploadMaterials(file)
                                e.target.value = ''
                            }}
                        />
                    </label>
                </div>
            </section>

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">사건 유형 관리</h2>
                <p className="mt-1 text-sm text-zinc-500">
                    업로드 CSV 헤더: name, description
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        onClick={downloadEvents}
                        disabled={loading}
                        className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                        사건 다운로드
                    </button>

                    <button
                        onClick={downloadEventSample}
                        className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50"
                    >
                        사건 샘플 다운로드
                    </button>

                    <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50">
                        사건 업로드
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) uploadEvents(file)
                                e.target.value = ''
                            }}
                        />
                    </label>
                </div>
            </section>
        </div>
    )
}