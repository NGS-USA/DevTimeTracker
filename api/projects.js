export default async function handler(req, res) {
  const token   = process.env.BASEROW_TOKEN
  const tableId = process.env.BASEROW_PROJECTS_TABLE_ID
  const base    = `https://api.baserow.io/api/database/rows/table/${tableId}`

  try {
    if (req.method === 'GET') {
      const { clientId } = req.query
      const r = await fetch(`${base}/?user_field_names=true&size=200&order_by=Name`, {
        headers: { Authorization: `Token ${token}` },
      })
      const data = await r.json()
      const projects = (data.results || [])
        .filter(row => !clientId || row.ClientID === clientId)
        .map(row => ({
          id:       String(row.id),
          clientId: row.ClientID,
          name:     row.Name,
        }))
      return res.status(200).json(projects)
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const r = await fetch(`${base}/?user_field_names=true`, {
        method:  'POST',
        headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ Name: body.name, ClientID: body.clientId }),
      })
      const data = await r.json()
      return res.status(r.status).json({
        id:       String(data.id),
        clientId: data.ClientID,
        name:     data.Name,
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}