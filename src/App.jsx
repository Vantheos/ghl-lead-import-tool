import { useState } from 'react'
import Header from './components/Header.jsx'
import Instructions from './components/Instructions.jsx'
import MappingTable from './components/MappingTable.jsx'
import UploadZone from './components/UploadZone.jsx'
import DownloadButton from './components/DownloadButton.jsx'
import { remapCsv } from './utils/remapCsv.js'

export default function App() {
  const [result, setResult] = useState(null)

  function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setResult({ error: 'non_csv' })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const output = remapCsv(new Uint8Array(e.target.result), file.name)
      setResult(output)
    }
    reader.readAsArrayBuffer(file)
  }

  function handleReset() {
    setResult(null)
  }

  return (
    <div className="min-h-screen bg-[#0C121D] text-white">
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <Header />
        <Instructions />
        <UploadZone onFile={handleFile} onReset={handleReset} />

        {result?.error === 'non_csv' && (
          <div className="bg-[#191E27] border border-red-500/40 rounded-xl p-5">
            <p className="font-semibold text-red-400">Invalid file type</p>
            <p className="text-sm mt-1 text-red-300">
              Only <code>.csv</code> files are accepted. Please upload a CSV file.
            </p>
          </div>
        )}

        {result?.filename && (
          <DownloadButton csv={result.csv} filename={result.filename} />
        )}

        {result?.issuesCsv && (
          <div className="bg-[#191E27] border border-[#D97126]/40 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-[#D97126]">Mapping discrepancies found</p>
              <button
                onClick={() => {
                  const blob = new Blob([result.issuesCsv], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = result.issuesFilename
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="bg-[#D97126] hover:bg-[#c0621f] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Download Mapping_Issues.csv
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  In mapping — not in uploaded file ({result.inMappingNotInFile.length})
                </p>
                {result.inMappingNotInFile.length === 0
                  ? <p className="text-xs text-gray-600 italic">None</p>
                  : <ul className="space-y-1">
                      {result.inMappingNotInFile.map(col => (
                        <li key={col}>
                          <code className="text-xs text-[#D97126] bg-[#0C121D] px-1.5 py-0.5 rounded">
                            {col}
                          </code>
                        </li>
                      ))}
                    </ul>
                }
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Removed from original ({result.inFileNotInMapping.length})
                </p>
                {result.inFileNotInMapping.length === 0
                  ? <p className="text-xs text-gray-600 italic">None</p>
                  : <ul className="space-y-1">
                      {result.inFileNotInMapping.map(col => (
                        <li key={col}>
                          <code className="text-xs text-gray-400 bg-[#0C121D] px-1.5 py-0.5 rounded">
                            {col}
                          </code>
                        </li>
                      ))}
                    </ul>
                }
              </div>
            </div>
          </div>
        )}

        <MappingTable />
      </div>
    </div>
  )
}
