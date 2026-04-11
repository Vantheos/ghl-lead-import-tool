import { useState, useRef, useCallback } from 'react'

export default function UploadZone({ onFile, onReset }) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFilename, setSelectedFilename] = useState(null)
  const inputRef = useRef(null)

  const processFile = useCallback((file) => {
    setSelectedFilename(file.name)
    onFile(file)
  }, [onFile])

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleChange(e) {
    const file = e.target.files[0]
    if (file) processFile(file)
  }

  function handleReset() {
    setSelectedFilename(null)
    if (inputRef.current) inputRef.current.value = ''
    onReset()
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-all
          ${isDragging
            ? 'border-[#3B8CCF] bg-[#3B8CCF]/10'
            : 'border-white/20 bg-[#191E27] hover:border-[#3B8CCF]/60 hover:bg-[#191E27]/80'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleChange}
        />
        <div className="space-y-3">
          <svg
            className="mx-auto h-10 w-10 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div>
            <p className="text-gray-300 font-medium">
              {selectedFilename
                ? <span className="text-[#3B8CCF]">{selectedFilename}</span>
                : 'Drop your CSV here, or click to browse'
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">CSV files only</p>
          </div>
        </div>
      </div>

      {selectedFilename && (
        <button
          onClick={handleReset}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Upload a different file
        </button>
      )}
    </div>
  )
}
