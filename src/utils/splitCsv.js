import { zipSync, strToU8 } from 'fflate'

export function splitCsv(csvString, outputFilename, leadsPerFile) {
  const lines = csvString.split('\n')
  const header = lines[0]
  const dataRows = lines.slice(1).filter(line => line.trim() !== '')

  const totalChunks = Math.ceil(dataRows.length / leadsPerFile)
  const padWidth = Math.max(String(totalChunks).length, 2)

  // Base name without extension for part filenames
  const dotIndex = outputFilename.lastIndexOf('.')
  const baseName = dotIndex !== -1 ? outputFilename.slice(0, dotIndex) : outputFilename

  const files = {}
  for (let i = 0; i < totalChunks; i++) {
    const chunkRows = dataRows.slice(i * leadsPerFile, (i + 1) * leadsPerFile)
    const chunkCsv = [header, ...chunkRows].join('\n')
    const partNum = String(i + 1).padStart(padWidth, '0')
    const partFilename = `${baseName}_part_${partNum}_${chunkRows.length}leads.csv`
    files[partFilename] = strToU8(chunkCsv)
  }

  const zipped = zipSync(files)

  return {
    blob: new Blob([zipped], { type: 'application/zip' }),
    zipFilename: `${baseName}_split.zip`,
    partCount: totalChunks,
  }
}
