import { useState } from 'react'
import { splitCsv } from '../utils/splitCsv.js'

export default function SplitDownload({ csv, filename }) {
  const [enabled, setEnabled] = useState(false)
  const [leadsPerFile, setLeadsPerFile] = useState(500)
  const [zipResult, setZipResult] = useState(null)

  function handleToggle(e) {
    setEnabled(e.target.checked)
    setZipResult(null)
  }

  function handleLeadsChange(e) {
    setLeadsPerFile(Math.max(1, parseInt(e.target.value) || 1))
    setZipResult(null)
  }

  function handleSplit() {
    const result = splitCsv(csv, filename, leadsPerFile)
    setZipResult(result)
  }

  function handleDownload() {
    const url = URL.createObjectURL(zipResult.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = zipResult.zipFilename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            className="w-4 h-4 accent-[#3B8CCF] cursor-pointer"
          />
          <span className="text-sm text-gray-300">Split Output File</span>
        </label>

        {enabled && (
          <>
            <label className="text-sm text-gray-400 whitespace-nowrap">Leads per file</label>
            <input
              type="number"
              min={1}
              value={leadsPerFile}
              onChange={handleLeadsChange}
              className="w-24 bg-[#0C121D] border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B8CCF] transition-colors"
            />
            <button
              onClick={handleSplit}
              className="bg-[#3B8CCF] hover:bg-[#2d7ab8] text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
            >
              Split File
            </button>
          </>
        )}
      </div>

      {zipResult && (
        <div className="bg-[#191E27] border border-[#3B8CCF]/30 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="font-semibold text-white">
              Split files ready ({zipResult.partCount} {zipResult.partCount === 1 ? 'file' : 'files'})
            </p>
            <p className="text-sm text-gray-400 mt-0.5">{zipResult.zipFilename}</p>
          </div>
          <button
            onClick={handleDownload}
            className="bg-[#3B8CCF] hover:bg-[#2d7ab8] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Download ZIP
          </button>
        </div>
      )}
    </div>
  )
}
