export function convertToCsv(
  data: Record<string, any>[],
  preferredHeaders?: string[]
) {
  if (!data.length) return ''

  const detectedHeaders = Object.keys(data[0])

  const headers =
    !preferredHeaders || !preferredHeaders.length
      ? detectedHeaders
      : [
          ...preferredHeaders.filter((h) => detectedHeaders.includes(h)),
          ...detectedHeaders.filter((h) => !preferredHeaders.includes(h)),
        ]

  const escapeCsvValue = (value: any) => {
    const text = (value ?? '').toString()
    const escaped = text.replace(/"/g, '""')
    return `"${escaped}"`
  }

  const rows = [
    headers.map(escapeCsvValue).join(','),
    ...data.map((row) =>
      headers.map((h) => escapeCsvValue(row[h])).join(',')
    ),
  ]

  return rows.join('\n')
}