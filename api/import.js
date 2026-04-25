// Translates the human-readable column headers produced by remapCsv.js
// (e.g. "Business Name", "Phone", "Street Address") into the camelCase
// keys the GHL Create Contact API expects. Headers not in this map are
// looked up against the location's contact custom fields by name; anything
// that still doesn't match gets surfaced in `droppedHeaders` so it's
// visible in the response.
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

// GHL's country field requires an ISO 3166-1 alpha-2 code.
const COUNTRY_NAME_TO_ISO = {
  'UNITED STATES': 'US',
  'UNITED STATES OF AMERICA': 'US',
  'USA': 'US', 'U.S.A.': 'US', 'U.S.': 'US', 'AMERICA': 'US',
  'CANADA': 'CA',
  'UNITED KINGDOM': 'GB', 'UK': 'GB', 'GREAT BRITAIN': 'GB',
  'ENGLAND': 'GB', 'SCOTLAND': 'GB', 'WALES': 'GB',
  'AUSTRALIA': 'AU', 'NEW ZEALAND': 'NZ', 'IRELAND': 'IE',
  'GERMANY': 'DE', 'FRANCE': 'FR', 'SPAIN': 'ES', 'ITALY': 'IT',
  'PORTUGAL': 'PT', 'NETHERLANDS': 'NL', 'BELGIUM': 'BE',
  'SWITZERLAND': 'CH', 'AUSTRIA': 'AT',
  'SWEDEN': 'SE', 'NORWAY': 'NO', 'DENMARK': 'DK', 'FINLAND': 'FI',
  'POLAND': 'PL',
  'MEXICO': 'MX', 'BRAZIL': 'BR', 'ARGENTINA': 'AR', 'CHILE': 'CL', 'COLOMBIA': 'CO',
  'JAPAN': 'JP', 'CHINA': 'CN', 'INDIA': 'IN',
  'SINGAPORE': 'SG', 'PHILIPPINES': 'PH',
  'SOUTH AFRICA': 'ZA',
  'UAE': 'AE', 'UNITED ARAB EMIRATES': 'AE',
}

function normalizeCountry(value) {
  if (value == null || value === '') return null
  const v = String(value).trim()
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase()
  return COUNTRY_NAME_TO_ISO[v.toUpperCase()] || null
}

const GHL = (token) => ({
  Authorization: `Bearer ${token}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json',
  Accept: 'application/json',
})

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

  // Fetch the location's contact custom fields once per /api/import call so we
  // can route unknown headers to them by name. Failure here is non-fatal.
  let customFieldMap = new Map()
  let customFieldFetchError = null
  try {
    customFieldMap = await fetchContactCustomFields({ token, locationId })
  } catch (err) {
    customFieldFetchError = err.message
    console.error('[import] Custom fields fetch failed (continuing without):', err.message)
  }

  const translated = contacts.map(c => translateContact(c, customFieldMap))
  const droppedHeaders = new Set()
  const unmappedCountries = new Set()
  translated.forEach(t => {
    t.dropped.forEach(k => droppedHeaders.add(k))
    if (t.unmappedCountry) unmappedCountries.add(t.unmappedCountry)
  })
  if (droppedHeaders.size > 0) {
    console.info('[import] Dropped headers (not in FIELD_MAP and no matching custom field):', [...droppedHeaders])
  }
  if (unmappedCountries.size > 0) {
    console.info('[import] Country values dropped (not in COUNTRY_NAME_TO_ISO):', [...unmappedCountries])
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
    unmappedCountries: [...unmappedCountries],
    customFieldsLoaded: customFieldMap.size,
    customFieldFetchError,
  })
}

async function fetchContactCustomFields({ token, locationId }) {
  const r = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}/customFields`, {
    headers: GHL(token),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`)
  }
  const data = await r.json()
  // GHL returns { customFields: [...] } in the v2 API; fall back to plain array.
  const fields = Array.isArray(data) ? data : (data.customFields || [])
  const map = new Map()
  for (const f of fields) {
    // Skip non-contact-scoped fields when the API exposes a model property.
    if (f.model && f.model !== 'contact') continue
    if (f.id && f.name) map.set(f.name, { id: f.id, dataType: f.dataType })
  }
  return map
}

function translateContact(raw, customFieldMap) {
  const body = {}
  const dropped = []
  const customFields = []
  let unmappedCountry = null

  for (const [key, rawValue] of Object.entries(raw)) {
    const value = rawValue == null ? '' : String(rawValue)
    const apiKey = FIELD_MAP[key]

    if (apiKey) {
      if (apiKey === 'country') {
        // Country can't be empty (GHL validator rejects ''), and must be a known ISO code.
        if (value === '') continue
        const iso = normalizeCountry(value)
        if (iso) body.country = iso
        else unmappedCountry = value
        continue
      }
      // All other standard fields: send through, including empty strings.
      body[apiKey] = value
      continue
    }

    // Try a matching contact custom field by exact name.
    const cf = customFieldMap.get(key)
    if (cf) {
      customFields.push({ id: cf.id, field_value: value })
      continue
    }

    dropped.push(key)
  }

  if (customFields.length > 0) body.customFields = customFields

  // GHL contact list display falls back to first/last/name. Mirror companyName
  // into `name` when nothing else is present so the contact isn't blank.
  if (!body.name && !body.firstName && !body.lastName && body.companyName) {
    body.name = body.companyName
  }

  return { body, dropped, unmappedCountry }
}

async function createContact(contactBody, { token, locationId, tag }) {
  const body = { ...contactBody, locationId, tags: [tag] }

  const r = await fetch('https://services.leadconnectorhq.com/contacts/', {
    method: 'POST',
    headers: GHL(token),
    body: JSON.stringify(body),
  })

  if (r.status === 201) {
    const data = await r.json().catch(() => ({}))
    return { action: 'created', id: data.contact?.id }
  }

  const text = await r.text().catch(() => '')
  throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`)
}
