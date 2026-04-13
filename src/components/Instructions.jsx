export default function Instructions() {
  return (
    <div className="bg-[#191E27] rounded-xl p-6 space-y-5">
      <h1 className="text-2xl font-bold text-white">Turbomock Lead List Remapping Tool For GHL Import</h1>

      <ol className="space-y-2 text-gray-300 list-decimal list-inside">
        <li>
          Watch Dar's "Importing Leads for Prospecting" video for reference.
        </li>
        <li>
          Don't forget to select the{' '}
          <span className="text-white font-medium">"Add tags to imported contacts"</span>{' '}
          checkbox and add the{' '}
          <code className="text-[#3B8CCF] bg-[#0C121D] px-1.5 py-0.5 rounded text-sm">-scrape-it</code>{' '}
          tag.
        </li>
      </ol>

      <p className="text-sm text-gray-400">
        Any columns that could not be mapped will be removed from the output file.
      </p>
    </div>
  )
}
