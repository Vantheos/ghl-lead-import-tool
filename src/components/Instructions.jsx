import mapping from '../mapping.json'

export default function Instructions() {
  return (
    <div className="bg-[#191E27] rounded-xl p-6 space-y-5">
      <h1 className="text-2xl font-bold text-white">GHL Lead Import Tool</h1>

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
        Any columns not listed in the mapping table below will be passed through to the output file unchanged.
      </p>

      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Column Mapping Reference
        </h2>
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-[#0C121D]">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-400">Original Column Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-400">GHL Field Name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {Object.entries(mapping).map(([original, remapped]) => (
                <tr key={original} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2 font-mono text-gray-400 text-xs">{original}</td>
                  <td className="px-4 py-2 text-[#3B8CCF]">{remapped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
