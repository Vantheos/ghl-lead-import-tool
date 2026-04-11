export default function DownloadButton({ csv, filename }) {
  function handleDownload() {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-[#191E27] border border-[#3B8CCF]/30 rounded-xl p-6 flex items-center justify-between">
      <div>
        <p className="font-semibold text-white">File ready</p>
        <p className="text-sm text-gray-400 mt-0.5">{filename}</p>
      </div>
      <button
        onClick={handleDownload}
        className="bg-[#3B8CCF] hover:bg-[#2d7ab8] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
      >
        Download
      </button>
    </div>
  )
}
