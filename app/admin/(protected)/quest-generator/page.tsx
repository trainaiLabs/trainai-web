'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../../lib/supabase/client'

type Material = {
    id: string
    name: string
    category: string
    usage_count: number
    last_used_at: string | null
    is_active: boolean
    memo: string | null
    created_at: string
}

type MaterialCandidate = {
    name: string
    category: string
    memo: string
}

const MATERIAL_POOL: MaterialCandidate[] = [
    { name: '오래된 라디오', category: '추억', memo: '추억형 소재' },
    { name: '낡은 우체통', category: '장소', memo: '동네 미스터리 소재' },
    { name: '접힌 사진', category: '미스터리', memo: '사진 기반 소재' },
    { name: '녹슨 자전거', category: '추억', memo: '오래된 물건 소재' },
    { name: '비밀 번호표', category: '미스터리', memo: '번호표 소재' },
    { name: '오래된 손전등', category: '생활소품', memo: '밤 미스터리 소재' },
    { name: '낡은 지도', category: '미스터리', memo: '탐험 소재' },
    { name: '종이별', category: '생활소품', memo: '감성 소재' },
    { name: '버려진 화분', category: '자연', memo: '식물 소재' },
    { name: '녹음기', category: '소리', memo: '소리 기록 소재' },
    { name: '오래된 카세트테이프', category: '추억', memo: '음악 추억 소재' },
    { name: '무인 사진관', category: '장소', memo: '사진 장소 소재' },
    { name: '고장난 시계', category: '시간', memo: '시간 미스터리 소재' },
    { name: '빈 액자', category: '생활소품', memo: '사진 상상 소재' },
    { name: '낯선 초대장', category: '미스터리', memo: '초대 소재' },
    { name: '반짝이는 단추', category: '생활소품', memo: '작은 물건 소재' },
    { name: '오래된 우산꽂이', category: '장소', memo: '생활 미스터리 소재' },
    { name: '모르는 책갈피', category: '생활소품', memo: '책 소재' },
    { name: '골목 벽화', category: '장소', memo: '동네 소재' },
    { name: '밤에만 켜지는 간판', category: '미스터리', memo: '야간 소재' },
    { name: '이름 없는 열차표', category: '미스터리', memo: '이동 소재' },
    { name: '작은 종소리', category: '소리', memo: '소리 소재' },
    { name: '낡은 공중전화', category: '장소', memo: '연락 소재' },
    { name: '사라진 문패', category: '미스터리', memo: '집 주변 소재' },
    { name: '유리병 속 쪽지', category: '미스터리', memo: '쪽지 소재' },
]

export default function QuestGeneratorPage() {
    const [materials, setMaterials] = useState<Material[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [name, setName] = useState('')
    const [category, setCategory] = useState('생활소품')
    const [memo, setMemo] = useState('')

    const [candidates, setCandidates] = useState<MaterialCandidate[]>([])
    const [selectedNames, setSelectedNames] = useState<string[]>([])

    useEffect(() => {
        loadMaterials()
    }, [])

    const existingNames = useMemo(() => {
        return new Set(materials.map((item) => normalizeName(item.name)))
    }, [materials])

    function normalizeName(value: string) {
        return value.trim().replace(/\s+/g, '').toLowerCase()
    }

    async function loadMaterials() {
        setLoading(true)

        const { data, error } = await supabase
            .from('quest_generator_materials')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            alert('소재 목록을 불러오지 못했습니다.')
            console.error(error)
        } else {
            setMaterials(data ?? [])
        }

        setLoading(false)
    }

    async function addMaterial() {
        if (!name.trim()) {
            alert('소재명을 입력해주세요.')
            return
        }

        setSaving(true)

        const { error } = await supabase.from('quest_generator_materials').insert({
            name: name.trim(),
            category,
            memo: memo.trim() || null,
        })

        if (error) {
            alert('소재 추가 실패: ' + error.message)
            console.error(error)
        } else {
            setName('')
            setMemo('')
            await loadMaterials()
        }

        setSaving(false)
    }

    function generateCandidates() {
        const filtered = MATERIAL_POOL.filter(
            (item) => !existingNames.has(normalizeName(item.name))
        )

        setCandidates(filtered.slice(0, 25))
        setSelectedNames(filtered.slice(0, 25).map((item) => item.name))
    }

    function toggleCandidate(name: string) {
        setSelectedNames((prev) =>
            prev.includes(name)
                ? prev.filter((item) => item !== name)
                : [...prev, name]
        )
    }

    async function saveSelectedCandidates() {
        const selected = candidates.filter((item) => selectedNames.includes(item.name))

        if (selected.length === 0) {
            alert('등록할 후보를 선택해주세요.')
            return
        }

        setSaving(true)

        const { error } = await supabase.from('quest_generator_materials').insert(
            selected.map((item) => ({
                name: item.name,
                category: item.category,
                memo: item.memo,
            }))
        )

        if (error) {
            alert('후보 등록 실패: ' + error.message)
            console.error(error)
        } else {
            alert(`${selected.length}개 소재를 등록했습니다.`)
            setCandidates([])
            setSelectedNames([])
            await loadMaterials()
        }

        setSaving(false)
    }

    async function toggleActive(item: Material) {
        const { error } = await supabase
            .from('quest_generator_materials')
            .update({ is_active: !item.is_active })
            .eq('id', item.id)

        if (error) {
            alert('상태 변경 실패: ' + error.message)
            return
        }

        await loadMaterials()
    }

    return (
        <div className="max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold">퀘스트 생성기</h1>
                <p className="mt-2 text-sm text-zinc-500">
                    기존 소재와 비교해 새로운 소재를 추천하고 저장합니다.
                </p>
            </div>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold">소재 후보 자동 추천</h2>
                <p className="mt-1 text-sm text-zinc-500">
                    기존 등록 소재와 겹치지 않는 후보만 추천합니다.
                </p>

                <div className="mt-4 flex gap-2">
                    <button
                        onClick={generateCandidates}
                        className="rounded-lg bg-black px-4 py-2 text-sm text-white"
                    >
                        새 소재 후보 만들기
                    </button>

                    {candidates.length > 0 && (
                        <button
                            onClick={saveSelectedCandidates}
                            disabled={saving}
                            className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                        >
                            선택한 후보 등록
                        </button>
                    )}
                </div>

                {candidates.length > 0 && (
                    <div className="mt-4 overflow-x-auto rounded-xl border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-zinc-50 text-left">
                                    <th className="p-3">선택</th>
                                    <th className="p-3">소재</th>
                                    <th className="p-3">카테고리</th>
                                    <th className="p-3">메모</th>
                                    <th className="p-3">상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {candidates.map((item) => (
                                    <tr key={item.name} className="border-b">
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedNames.includes(item.name)}
                                                onChange={() => toggleCandidate(item.name)}
                                            />
                                        </td>
                                        <td className="p-3 font-medium">{item.name}</td>
                                        <td className="p-3">{item.category}</td>
                                        <td className="p-3 text-zinc-500">{item.memo}</td>
                                        <td className="p-3 text-green-600">신규</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold">소재 직접 추가</h2>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="예: 오래된 USB"
                        className="rounded-lg border px-3 py-2 text-sm"
                    />

                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="rounded-lg border px-3 py-2 text-sm"
                    >
                        <option>생활소품</option>
                        <option>장소</option>
                        <option>사람</option>
                        <option>자연</option>
                        <option>추억</option>
                        <option>미스터리</option>
                        <option>시간</option>
                        <option>소리</option>
                        <option>기타</option>
                    </select>

                    <input
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="메모"
                        className="rounded-lg border px-3 py-2 text-sm"
                    />

                    <button
                        onClick={addMaterial}
                        disabled={saving}
                        className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                        {saving ? '저장 중...' : '소재 추가'}
                    </button>
                </div>
            </section>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">소재 목록</h2>
                    <button
                        onClick={loadMaterials}
                        className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50"
                    >
                        새로고침
                    </button>
                </div>

                <div className="mt-4 overflow-x-auto">
                    {loading ? (
                        <p className="text-sm text-zinc-500">불러오는 중...</p>
                    ) : (
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b bg-zinc-50 text-left">
                                    <th className="p-3">소재</th>
                                    <th className="p-3">카테고리</th>
                                    <th className="p-3">사용횟수</th>
                                    <th className="p-3">상태</th>
                                    <th className="p-3">메모</th>
                                    <th className="p-3">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {materials.map((item) => (
                                    <tr key={item.id} className="border-b">
                                        <td className="p-3 font-medium">{item.name}</td>
                                        <td className="p-3">{item.category}</td>
                                        <td className="p-3">{item.usage_count}</td>
                                        <td className="p-3">
                                            {item.is_active ? '사용중' : '비활성'}
                                        </td>
                                        <td className="p-3 text-zinc-500">{item.memo ?? '-'}</td>
                                        <td className="p-3">
                                            <button
                                                onClick={() => toggleActive(item)}
                                                className="rounded-lg border px-3 py-1 text-xs hover:bg-zinc-50"
                                            >
                                                {item.is_active ? '비활성화' : '활성화'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {materials.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-6 text-center text-zinc-500">
                                            등록된 소재가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>
        </div>
    )
}