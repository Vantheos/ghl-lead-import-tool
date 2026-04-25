export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const expected = process.env.GHL_IMPORT_PASSWORD
  if (!expected) return res.status(500).json({ error: 'Server not configured' })

  const provided = req.body?.passphrase
  if (!provided || provided !== expected) {
    // 400ms delay to make casual brute-force unattractive
    setTimeout(() => res.status(401).json({ ok: false }), 400)
    return
  }

  res.json({ ok: true })
}
