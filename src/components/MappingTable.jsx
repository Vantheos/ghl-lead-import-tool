import mapping from '../mapping.json'

export default function MappingTable() {
  return (
    <div className="bg-[#191E27] rounded-xl p-6">
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
  )
}
