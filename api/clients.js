async function readBody(req) {
  if (req.body !== undefined) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  }
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}) }
      catch { resolve({}) }
    })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  const token   = process.env.BASEROW_TOKEN
  const tableId = process.env.BASEROW_CLIENTS_TABLE_ID
  const base    = `https://api.baserow.io/api/database/rows/table/${tableId}`

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${base}/?user_field_names=true&size=200&order_by=Name`, {
        headers: { Authorization: `Token ${token}` },
      })
      const data = await r.json()
      const clients = (data.results || []).map(row => ({
        id:   String(row.id),
        name: row.Name,
      }))
      return res.status(200).json(clients)
    }

    if (req.method === 'POST') {
      const body = await readBody(req)
      const r = await fetch(`${base}/?user_field_names=true`, {
        method:  'POST',
        headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ Name: body.name }),
      })
      const data = await r.json()
      return res.status(r.status).json({ id: String(data.id), name: data.Name })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}