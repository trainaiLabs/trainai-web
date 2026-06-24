'use client'

import { useState } from 'react'
import { supabase } from '../../../../lib/supabase/client'

type MaterialCsvRow = {
    name: string
}

type EventCsvRow = {
    name: string
    pattern_type: string
    primary_style: string
    secondary_style: string
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
            .select('name, material_type, material_tag, usage_count, is_active, created_at')
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
                'material_type',
                'material_tag',
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
            .select('name, pattern_type, primary_style, secondary_style, usage_count, is_active, created_at')
            .order('created_at', { ascending: false })

        setLoading(false)

        if (error) {
            alert('질문패턴 다운로드 실패: ' + error.message)
            return
        }

        downloadTextFile(
            'quest_events.csv',
            toCsv(data ?? [], [
                'name',
                'pattern_type',
                'primary_style',
                'secondary_style',
                'usage_count',
                'is_active',
                'created_at',
            ])
        )
    }

    async function uploadMaterials(file: File) {
        const text = await file.text()
        const rows = parseCsv(text)

        const validTypes = ['object', 'concept', 'trace', 'place', 'digital', 'event']

        const validRows = rows
            .map((row) => ({
                name: row.name?.trim(),
                material_type: row.material_type?.trim() || 'object',
                material_tag: row.material_tag?.trim() || 'general',
            }))
            .filter((row) => row.name)

        const invalid = validRows.find(
            (row) => !validTypes.includes(row.material_type)
        )

        if (invalid) {
            alert(
                `소재 타입 오류: ${invalid.name} / ${invalid.material_type}\n가능한 값: object, situation, trace, place`
            )
            return
        }

        const seen = new Set<string>()
        const dedupedRows = validRows.filter((row) => {
            const key = row.name.trim()
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })

        if (dedupedRows.length === 0) {
            alert('업로드할 소재가 없습니다.')
            return
        }

        setLoading(true)

        const { error } = await supabase
            .from('quest_generator_materials')
            .upsert(dedupedRows, {
                onConflict: 'name',
            })

        setLoading(false)

        if (error) {
            alert('소재 업로드 실패: ' + error.message)
            return
        }

        alert(`${dedupedRows.length}개 소재를 등록 또는 업데이트했습니다.`)
    }

    async function uploadEvents(file: File) {
        const text = await file.text()
        const rows = parseCsv(text)

        const validTypes = ['object', 'situation', 'trace', 'place', 'digital', 'event']

        const validStyles = [
            'mystery',
            'choice',
            'conflict',
            'relationship',
            'fantasy',
            'game',
            'daily',
            'meaning',
            'survival',
        ]

        const validRows = rows
            .map((row) => ({
                name: row.name?.trim(),
                pattern_type: row.pattern_type?.trim() || 'object',
                primary_style: row.primary_style?.trim() || 'daily',
                secondary_style: row.secondary_style?.trim() || 'meaning',
            }))
            .filter((row) => row.name)

        const invalidType = validRows.find(
            (row) => !validTypes.includes(row.pattern_type)
        )

        if (invalidType) {
            alert(
                `질문패턴 타입 오류: ${invalidType.name} / ${invalidType.pattern_type}\n가능한 값: object, situation, trace, place, digital, event`
            )
            return
        }

        const invalidStyle = validRows.find(
            (row) =>
                !validStyles.includes(row.primary_style) ||
                !validStyles.includes(row.secondary_style)
        )

        if (invalidStyle) {
            alert(
                `질문패턴 스타일 오류: ${invalidStyle.name}\n가능한 값: mystery, choice, conflict, relationship, fantasy, game, daily, meaning, survival`
            )
            return
        }

        const invalidPattern = validRows.find((row) => validatePattern(row.name))

        if (invalidPattern) {
            alert(validatePattern(invalidPattern.name))
            return
        }

        const seen = new Set<string>()
        const dedupedRows = validRows.filter((row) => {
            const key = row.name.trim()
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })

        if (dedupedRows.length === 0) {
            alert('업로드할 질문패턴이 없습니다.')
            return
        }

        setLoading(true)

        const { error } = await supabase
            .from('quest_generator_events')
            .upsert(dedupedRows, {
                onConflict: 'name',
            })

        setLoading(false)

        if (error) {
            alert('질문패턴 업로드 실패: ' + error.message)
            return
        }

        alert(`${dedupedRows.length}개 질문패턴을 등록 또는 업데이트했습니다.`)
    }

    function downloadMaterialSample() {
        downloadTextFile(
            'quest_materials_sample.csv',
            '\uFEFFname,material_type,material_tag\n열리지 않은 시간캡슐,object,container\n멈춘 시계탑,place,fixed_place\n전송되지 않은 메시지,digital,message'
        )
    }

    function downloadEventSample() {
        downloadTextFile(
            'quest_events_sample.csv',
            '\uFEFFname,pattern_type,primary_style,secondary_style\n{material}의 주인을 찾아야 한다면,object,mystery,meaning\n{material} 때문에 분위기가 달라진다면,event,daily,meaning\n{material}를 두고 선택이 갈린다면,situation,choice,conflict\n{material}가 말을 건다면,object,fantasy,relationship'
        )
    }

    function validatePattern(name: string) {
        if (!name.includes('{material}')) {
            return '질문패턴에는 {material}이 반드시 들어가야 합니다.'
        }

        return null
    }

    return (
        <div className="max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold">퀘스트 생성기</h1>
                <p className="mt-2 text-sm text-zinc-500">
                    소재와 질문패턴 유형을 CSV 파일로 내려받고 업로드합니다.
                </p>
            </div>

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold">소재 관리</h2>
                <p className="mt-1 text-sm text-zinc-500">
                    업로드 CSV 헤더: name, material_type
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
                <h2 className="text-lg font-bold">질문패턴 유형 관리</h2>
                <p className="mt-1 text-sm text-zinc-500">
                    업로드 CSV 헤더: name, pattern_type, primary_style, secondary_style
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        onClick={downloadEvents}
                        disabled={loading}
                        className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                        질문패턴 다운로드
                    </button>

                    <button
                        onClick={downloadEventSample}
                        className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50"
                    >
                        질문패턴 샘플 다운로드
                    </button>

                    <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50">
                        질문패턴 업로드
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