// Translates the human-readable column headers produced by remapCsv.js
// (e.g. "Business Name", "Phone", "Street Address") into the camelCase
// keys the GHL Create Contact API expects. Anything not in this map is
// dropped — those fields would need to be sent as customFields (by ID),
// which is a follow-up.
const FIELD_MAP = {
  'Business Name': 'companyName',
  'Company Name':  'companyName',
  'First Name':    'firstName',
  'Last Name':     'lastName',
  'Name':          'name',
  'Email':         'email',
  'Phone':         'phone',
  'Website':       'website',
  'Street Address':'address1',
  'Address':       'address1',
  'Address Line 2':'address2',
  'City':          'city',
  'State':         'state',
  'Country':       'country',
  'Postal Code':   'postalCode',
  'Zip':           'postalCode',
  'Timezone':      'timezone',
  'Date of Birth': 'dateOfBirth',
  'Source':        'source',
}

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

  // Translate once up-front and collect dropped column names so we can report them
  const translated = contacts.map(translateContact)
  const droppedHeaders = new Set()
  translated.forEach(t => t.dropped.forEach(k => droppedHeaders.add(k)))
  if (droppedHeaders.size > 0) {
    console.info('[import] Dropped headers (not in FIELD_MAP):', [...droppedHeaders])
  }

  // Concurrency 5 to stay under GHL rate limit (100 req / 10 s per location)
  const CONCURRENCY = 5
  const results = []
  for (let i = 0; i < translated.length; i += CONCURRENCY) {
    const batch = translated.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(
      batch.map(t => createContact(t.body, { token, locationId, tag }))
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
    droppedHeaders: [...droppedHeaders],
  })
}

function translateContact(raw) {
  const body = {}
  const dropped = []
  for (const [key, value] of Object.entries(raw)) {
    if (value === '' || value == null) continue
    const apiKey = FIELD_MAP[key]
    if (apiKey) {
      body[apiKey] = String(value)
    } else {
      dropped.push(key)
    }
  }
  // GHL display works better when `name` is set. If we have companyName but no
  // first/last/name, mirror companyName into name so the contact list shows it.
  if (!body.name && !body.firstName && !body.lastName && body.companyName) {
    body.name = body.companyName
  }
  return { body, dropped }
}

async function createContact(contactBody, { token, locationId, tag }) {
  const body = { ...contactBody, locationId, tags: [tag] }

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
