export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const expectedPass = process.env.GHL_IMPORT_PASSWORD
  const provided = req.headers['x-import-auth']
  if (!expectedPass || !provided || provided !== expectedPass) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = process.env.GHL_API_TOKEN
  const locationId = process.env.GHL_LOCATION_ID
  const tag = process.env.GHL_IMPORT_TAG
  if (!token || !locationId || !tag) {
    return res.status(500).json({ error: 'GHL env vars not configured' })
  }

  const { contacts } = req.body || {}
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: 'contacts array required' })
  }

  // Concurrency 5 to stay under GHL rate limit (100 req / 10 s per location)
  const CONCURRENCY = 5
  const results = []
  for (let i = 0; i < contacts.length; i += CONCURRENCY) {
    const batch = contacts.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(
      batch.map(c => createContact(c, { token, locationId, tag }))
    )
    settled.forEach((r, idx) => {
      results.push({
        row: i + idx,
        ...(r.status === 'fulfilled'
          ? r.value
          : { action: 'error', error: r.reason?.message || String(r.reason) }),
      })
    })
  }

  const created = results.filter(r => r.action === 'created').length
  const errors = results.filter(r => r.action === 'error')
  res.json({
    ok: errors.length === 0,
    total: contacts.length,
    created,
    errors,
  })
}

async function createContact(contact, { token, locationId, tag }) {
  const existingTags = Array.isArray(contact.tags) ? contact.tags : []
  const body = { ...contact, locationId, tags: [...existingTags, tag] }

  const r = await fetch('https://services.leadconnectorhq.com/contacts/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Version: '2021-07-28',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (r.status === 201) {
    const data = await r.json().catch(() => ({}))
    return { action: 'created', id: data.contact?.id }
  }

  const text = await r.text().catch(() => '')
  throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`)
}
