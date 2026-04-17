import * as XLSX from 'xlsx'
import mapping from '../mapping.json'
import hiddenMapping from '../hiddenMapping.json'

export function remapCsv(fileArrayBuffer, originalFilename) {
  const workbook = XLSX.read(fileArrayBuffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  if (rows.length === 0) {
    return { error: 'empty', message: 'The uploaded file is empty.' }
  }

  const headers = rows[0]

  // Merge visible and hidden mappings into a single case-insensitive lookup
  const allMappings = { ...mapping, ...hiddenMapping }
  const lookupMap = Object.fromEntries(
    Object.entries(allMappings).map(([k, v]) => [k.toLowerCase(), v])
  )

  const getRemapped = (header) => lookupMap[String(header).toLowerCase()]

  // Only keep columns that have a mapping entry (case-insensitive match)
  const mappedIndices = headers.reduce((acc, h, i) => {
    if (getRemapped(h) !== undefined) acc.push(i)
    return acc
  }, [])

  const newHeaders = mappedIndices.map(i => getRemapped(headers[i]))
  const newRows = [
    newHeaders,
    ...rows.slice(1).map(row => mappedIndices.map(i => row[i] ?? '')),
  ]

  const newSheet = XLSX.utils.aoa_to_sheet(newRows)
  const csvOutput = XLSX.utils.sheet_to_csv(newSheet)

  // Insert _GHL_ready before the file extension
  const dotIndex = originalFilename.lastIndexOf('.')
  const outputFilename = dotIndex !== -1
    ? `${originalFilename.slice(0, dotIndex)}_GHL_ready${originalFilename.slice(dotIndex)}`
    : `${originalFilename}_GHL_ready.csv`

  // Track columns removed from the original (not matched by any mapping)
  const inFileNotInMapping = headers.filter(h => getRemapped(h) === undefined)

  let issuesCsv = null
  if (inFileNotInMapping.length > 0) {
    const issueRows = [['Removed From Original'], ...inFileNotInMapping.map(col => [col])]
    const issuesSheet = XLSX.utils.aoa_to_sheet(issueRows)
    issuesCsv = XLSX.utils.sheet_to_csv(issuesSheet)
  }

  return {
    csv: csvOutput,
    filename: outputFilename,
    ...(issuesCsv ? { issuesCsv, issuesFilename: 'Mapping_Issues.csv' } : {}),
  }
}
