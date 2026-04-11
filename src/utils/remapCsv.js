import * as XLSX from 'xlsx'
import mapping from '../mapping.json'

export function remapCsv(fileArrayBuffer, originalFilename) {
  const workbook = XLSX.read(fileArrayBuffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  if (rows.length === 0) {
    return { error: 'empty', message: 'The uploaded file is empty.' }
  }

  const headers = rows[0]
  const mappingKeys = Object.keys(mapping)

  // Columns expected by mapping but absent from the file
  const inMappingNotInFile = mappingKeys.filter(key => !headers.includes(key))

  // Columns in the file that have no mapping entry (will pass through unchanged)
  const inFileNotInMapping = headers.filter(h => !mappingKeys.includes(h))

  // Remap headers — unmapped columns pass through unchanged
  const newHeaders = headers.map(h => mapping[h] ?? h)
  const newRows = [newHeaders, ...rows.slice(1)]

  const newSheet = XLSX.utils.aoa_to_sheet(newRows)
  const csvOutput = XLSX.utils.sheet_to_csv(newSheet)

  // Insert _GHL_ready before the file extension
  const dotIndex = originalFilename.lastIndexOf('.')
  const outputFilename = dotIndex !== -1
    ? `${originalFilename.slice(0, dotIndex)}_GHL_ready${originalFilename.slice(dotIndex)}`
    : `${originalFilename}_GHL_ready.csv`

  // Build issues CSV only when there are discrepancies
  let issuesCsv = null
  if (inMappingNotInFile.length > 0 || inFileNotInMapping.length > 0) {
    const issueRows = [['Issue', 'Column Name']]

    for (const col of inMappingNotInFile) {
      issueRows.push(['In mapping table — not found in uploaded file', col])
    }
    for (const col of inFileNotInMapping) {
      issueRows.push(['In uploaded file — not in mapping table (passed through)', col])
    }

    const issuesSheet = XLSX.utils.aoa_to_sheet(issueRows)
    issuesCsv = XLSX.utils.sheet_to_csv(issuesSheet)
  }

  return {
    csv: csvOutput,
    filename: outputFilename,
    ...(issuesCsv ? {
      issuesCsv,
      issuesFilename: 'Mapping_Issues.csv',
      inMappingNotInFile,
      inFileNotInMapping,
    } : {}),
  }
}
