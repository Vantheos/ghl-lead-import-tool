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

  // Abort if any required mapping key is missing from the file's headers
  const missingColumns = Object.keys(mapping).filter(key => !headers.includes(key))
  if (missingColumns.length > 0) {
    return { error: 'missing_columns', missing: missingColumns }
  }

  // Remap headers in place — unmapped columns pass through unchanged
  const newHeaders = headers.map(h => mapping[h] ?? h)
  const newRows = [newHeaders, ...rows.slice(1)]

  const newSheet = XLSX.utils.aoa_to_sheet(newRows)
  const csvOutput = XLSX.utils.sheet_to_csv(newSheet)

  // Insert _GHL_ready before the file extension
  const dotIndex = originalFilename.lastIndexOf('.')
  const outputFilename = dotIndex !== -1
    ? `${originalFilename.slice(0, dotIndex)}_GHL_ready${originalFilename.slice(dotIndex)}`
    : `${originalFilename}_GHL_ready.csv`

  return { csv: csvOutput, filename: outputFilename }
}
