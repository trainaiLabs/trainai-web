export function downloadCsv(csv: string, fileName: string) {
  // 🔥 핵심: BOM 추가
  const BOM = '\uFEFF'

  const blob = new Blob([BOM + csv], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()

  URL.revokeObjectURL(url)
}