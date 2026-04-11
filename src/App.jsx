import { useState } from 'react'
import Header from './components/Header.jsx'
import Instructions from './components/Instructions.jsx'
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
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
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

        {result?.error === 'missing_columns' && (
          <div className="bg-[#191E27] border border-[#D97126]/40 rounded-xl p-5">
            <p className="font-semibold text-[#D97126]">
              Missing required columns ({result.missing.length})
            </p>
            <p className="text-sm mt-1 text-gray-300">
              Add the missing columns to your file and re-upload when ready.
            </p>
            <ul className="mt-3 space-y-1">
              {result.missing.map(col => (
                <li key={col}>
                  <code className="text-sm text-[#D97126] bg-[#0C121D] px-1.5 py-0.5 rounded">
                    {col}
                  </code>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result?.csv && (
          <DownloadButton csv={result.csv} filename={result.filename} />
        )}
      </div>
    </div>
  )
}
