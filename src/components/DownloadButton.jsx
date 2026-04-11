export default function DownloadButton({ csv, filename, variant = 'default' }) {
  function handleDownload() {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const isWarning = variant === 'warning'

  return (
    <div className={`bg-[#191E27] border rounded-xl p-6 flex items-center justify-between ${
      isWarning ? 'border-[#D97126]/40' : 'border-[#3B8CCF]/30'
    }`}>
      <div>
        <p className={`font-semibold ${isWarning ? 'text-[#D97126]' : 'text-white'}`}>
          {isWarning ? 'Mapping discrepancies found' : 'File ready'}
        </p>
        <p className="text-sm text-gray-400 mt-0.5">{filename}</p>
      </div>
      <button
        onClick={handleDownload}
        className={`font-semibold px-6 py-3 rounded-lg transition-colors text-white ${
          isWarning
            ? 'bg-[#D97126] hover:bg-[#c0621f]'
            : 'bg-[#3B8CCF] hover:bg-[#2d7ab8]'
        }`}
      >
        Download
      </button>
    </div>
  )
}
