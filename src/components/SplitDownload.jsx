import { useState } from 'react'
import * as XLSX from 'xlsx'
import { splitCsv } from '../utils/splitCsv.js'

export default function SplitDownload({ csv, filename }) {
  const [enabled, setEnabled] = useState(false)
  const [leadsPerFile, setLeadsPerFile] = useState(500)
  const [zipResult, setZipResult] = useState(null)
  const [showList, setShowList] = useState(false)

  const [unlocked, setUnlocked] = useState(
    () => typeof window !== 'undefined' && !!sessionStorage.getItem('ghl_unlock')
  )
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [unlockInput, setUnlockInput] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [importState, setImportState] = useState({})

  function handleToggle(e) {
    setEnabled(e.target.checked)
    setZipResult(null)
    setShowList(false)
    setImportState({})
  }

  function handleLeadsChange(e) {
    setLeadsPerFile(Math.max(1, parseInt(e.target.value) || 1))
    setZipResult(null)
    setShowList(false)
    setImportState({})
  }

  function handleSplit() {
    const result = splitCsv(csv, filename, leadsPerFile)
    setZipResult(result)
    setShowList(false)
    setImportState({})
  }

  function handleDownload() {
    const url = URL.createObjectURL(zipResult.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = zipResult.zipFilename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDownloadPart(part) {
    const blob = new Blob([part.csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = part.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleUnlock(e) {
    e.preventDefault()
    setUnlockError('')
    try {
      const r = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: unlockInput }),
      })
      if (r.ok) {
        sessionStorage.setItem('ghl_unlock', unlockInput)
        setUnlocked(true)
        setUnlockOpen(false)
        setUnlockInput('')
      } else {
        setUnlockError('Incorrect passphrase')
      }
    } catch (err) {
      setUnlockError('Network error — try again')
    }
  }

  function handleLock() {
    sessionStorage.removeItem('ghl_unlock')
    setUnlocked(false)
  }

  async function handleImport(part) {
    setImportState(s => ({ ...s, [part.filename]: 'importing' }))
    try {
      const wb = XLSX.read(part.csv, { type: 'string' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const contacts = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      const r = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Import-Auth': sessionStorage.getItem('ghl_unlock') || '',
        },
        body: JSON.stringify({ contacts }),
      })

      if (r.status === 401) {
        handleLock()
        throw new Error('Session expired — please unlock again')
      }

      const result = await r.json()
      if (!r.ok) throw new Error(result.error || `HTTP ${r.status}`)

      if (result.errors?.length) {
        console.error(`Import errors for ${part.filename}:`, result.errors)
      }
      setImportState(s => ({ ...s, [part.filename]: result }))
    } catch (err) {
      setImportState(s => ({
        ...s,
        [part.filename]: { ok: false, created: 0, errors: [{ error: err.message }] },
      }))
    }
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

      {zipResult && (
        <div className="flex items-center justify-center">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showList}
              onChange={(e) => setShowList(e.target.checked)}
              className="w-4 h-4 accent-[#3B8CCF] cursor-pointer"
            />
            <span className="text-sm text-gray-300">List files individually</span>
          </label>
        </div>
      )}

      {zipResult && showList && !unlocked && (
        <div className="flex flex-col items-center gap-2">
          {!unlockOpen ? (
            <button
              onClick={() => setUnlockOpen(true)}
              className="bg-transparent border border-white/20 text-gray-300 hover:border-[#3B8CCF] hover:text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
            >
              🔒 Unlock Import
            </button>
          ) : (
            <form onSubmit={handleUnlock} className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={unlockInput}
                  onChange={(e) => setUnlockInput(e.target.value)}
                  placeholder="Passphrase"
                  autoFocus
                  className="w-56 bg-[#0C121D] border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3B8CCF] transition-colors"
                />
                <button
                  type="submit"
                  className="bg-[#3B8CCF] hover:bg-[#2d7ab8] text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Unlock
                </button>
                <button
                  type="button"
                  onClick={() => { setUnlockOpen(false); setUnlockInput(''); setUnlockError('') }}
                  className="text-gray-400 hover:text-white text-sm px-2"
                >
                  Cancel
                </button>
              </div>
              {unlockError && (
                <p className="text-[#D97126] text-xs">{unlockError}</p>
              )}
            </form>
          )}
        </div>
      )}

      {zipResult && showList && unlocked && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-gray-400">Import unlocked</span>
          <button
            onClick={handleLock}
            className="text-xs text-gray-400 hover:text-white underline"
          >
            Lock
          </button>
        </div>
      )}

      {zipResult && showList && (
        <div className="bg-[#191E27] border border-[#3B8CCF]/30 rounded-xl p-4 space-y-1">
          {zipResult.parts.map((part) => {
            const status = importState[part.filename]
            const isImporting = status === 'importing'
            const isComplete = status && typeof status === 'object'
            const isSuccess = isComplete && status.ok && (!status.errors || status.errors.length === 0)
            return (
              <div
                key={part.filename}
                className="flex items-center justify-between gap-4 px-3 py-2 border-b border-white/5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white text-sm truncate">{part.filename}</p>
                  <p className="text-xs text-gray-400">{part.leadCount} {part.leadCount === 1 ? 'lead' : 'leads'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDownloadPart(part)}
                    className="bg-[#3B8CCF] hover:bg-[#2d7ab8] text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    Download
                  </button>
                  {unlocked && !isComplete && !isImporting && (
                    <button
                      onClick={() => handleImport(part)}
                      className="bg-[#059669] hover:bg-[#047857] text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                      Import
                    </button>
                  )}
                  {unlocked && isImporting && (
                    <button
                      disabled
                      className="bg-[#059669]/50 text-white/70 font-semibold px-4 py-2 rounded-lg text-sm cursor-not-allowed"
                    >
                      Importing…
                    </button>
                  )}
                  {unlocked && isComplete && (
                    <span
                      className={`text-sm font-medium px-2 ${isSuccess ? 'text-[#3B8CCF]' : 'text-[#D97126]'}`}
                    >
                      {isSuccess
                        ? `✓ ${status.created} new`
                        : `⚠ ${status.created || 0} new, ${status.errors?.length || 0} errors — see console`}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
