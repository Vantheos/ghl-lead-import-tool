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

  // Columns in the file that have no mapping entry — will be removed from output
  const inFileNotInMapping = headers.filter(h => !mappingKeys.includes(h))

  // Only keep columns that exist in the mapping; remap their headers
  const mappedIndices = headers.reduce((acc, h, i) => {
    if (mapping[h] !== undefined) acc.push(i)
    return acc
  }, [])

  const newHeaders = mappedIndices.map(i => mapping[headers[i]])
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

  // Build issues CSV when there are any discrepancies
  let issuesCsv = null
  if (inMappingNotInFile.length > 0 || inFileNotInMapping.length > 0) {
    const issueRows = [['Removed From Original'], ...inFileNotInMapping.map(col => [col])]
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
