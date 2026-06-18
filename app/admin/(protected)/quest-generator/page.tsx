'use client'

import { useState } from 'react'
import { supabase } from '../../../../lib/supabase/client'

type MaterialCsvRow = {
    name: string
}

type EventCsvRow = {
    name: string
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
            .select('name, material_type, usage_count, is_active, created_at')
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
            .select('name, pattern_type, usage_count, is_active, created_at')
            .order('created_at', { ascending: false })

        setLoading(false)

        if (error) {
            alert('질문패턴 다운로드 실패: ' + error.message)
            return
        }

        downloadTextFile(
            'quest_events.csv',
            toCsv(data ?? [], ['name', 'pattern_type', 'usage_count', 'is_active', 'created_at'])
        )
    }

    async function uploadMaterials(file: File) {
        const text = await file.text()
        const rows = parseCsv(text)

        const validTypes = ['object', 'situation', 'trace', 'place']

        const validRows = rows
            .map((row) => ({
                name: row.name?.trim(),
                material_type: row.material_type?.trim() || 'object',
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

        if (!confirm(`기존 소재를 모두 삭제하고 ${validRows.length}개를 새로 등록할까요?`)) {
            return
        }

        setLoading(true)

        const { error: deleteError } = await supabase
            .from('quest_generator_materials')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')

        if (deleteError) {
            setLoading(false)
            alert('기존 소재 삭제 실패: ' + deleteError.message)
            return
        }

        const { error } = await supabase
            .from('quest_generator_materials')
            .insert(validRows)

        setLoading(false)

        if (error) {
            alert('소재 업로드 실패: ' + error.message)
            return
        }

        alert(`${validRows.length}개 소재를 새로 등록했습니다.`)
    }

    async function uploadEvents(file: File) {
        const text = await file.text()
        const rows = parseCsv(text)

        const validTypes = ['object', 'situation', 'trace', 'place']

        const validRows = rows
            .map((row) => ({
                name: row.name?.trim(),
                pattern_type: row.pattern_type?.trim() || 'object',
            }))
            .filter((row) => row.name)

        const invalidType = validRows.find(
            (row) => !validTypes.includes(row.pattern_type)
        )

        if (invalidType) {
            alert(
                `질문패턴 타입 오류: ${invalidType.name} / ${invalidType.pattern_type}\n가능한 값: object, situation, trace, place`
            )
            return
        }

        const invalidPattern = validRows.find((row) => !row.name.includes('{material}'))

        if (invalidPattern) {
            alert(`질문패턴에는 {material}이 필요합니다.\n문제 패턴: ${invalidPattern.name}`)
            return
        }

        if (
            !confirm(
                `기존 질문패턴을 모두 삭제하고 ${validRows.length}개를 새로 등록할까요?`
            )
        ) {
            return
        }

        setLoading(true)

        const { error: deleteError } = await supabase
            .from('quest_generator_events')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')

        if (deleteError) {
            setLoading(false)
            alert('기존 질문패턴 삭제 실패: ' + deleteError.message)
            return
        }

        const { error } = await supabase
            .from('quest_generator_events')
            .insert(validRows)

        setLoading(false)

        if (error) {
            alert('질문패턴 업로드 실패: ' + error.message)
            return
        }

        alert(`${validRows.length}개 질문패턴을 새로 등록했습니다.`)
    }

    function downloadMaterialSample() {
        downloadTextFile(
            'quest_materials_sample.csv',
            '\uFEFFname,material_type\n정체불명의 열쇠고리,object\n사라진 안내방송,situation\n이상한 발자국,trace\n새벽의 편의점,place'
        )
    }

    function downloadEventSample() {
        downloadTextFile(
            'quest_events_sample.csv',
            '\uFEFFname,pattern_type\n{material}의 주인을 찾아야 한다면,object\n{material} 때문에 분위기가 달라진다면,situation\n{material}를 남긴 사람이 궁금하다면,trace\n{material}에서 예상치 못한 일이 벌어진다면,place'
        )
    }

    function validatePattern(name: string) {
        if (!name.includes('{material}')) {
            return '질문패턴에는 {material}이 반드시 들어가야 합니다.'
        }

        const banned = [
            '{material}가',
            '{material}이',
            '{material}를',
            '{material}을',
            '{material}는',
            '{material}은',
        ]

        const found = banned.find((item) => name.includes(item))

        if (found) {
            return `${found} 직접 사용 금지. {subject} {object} {topic}을 사용해주세요.`
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
                <h2 className="text-lg font-bold">질문패턴 유형 관리</h2>
                <p className="mt-1 text-sm text-zinc-500">
                    업로드 CSV 헤더: name, description
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