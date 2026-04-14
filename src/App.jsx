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

        <MappingTable />
      </div>
    </div>
  )
}
