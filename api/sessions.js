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
  const tableId = process.env.BASEROW_SESSIONS_TABLE_ID
  const base    = `https://api.baserow.io/api/database/rows/table/${tableId}`

  try {
    if (req.method === 'GET') {
      const { projectId } = req.query
      const r = await fetch(`${base}/?user_field_names=true&size=200&order_by=-id`, {
        headers: { Authorization: `Token ${token}` },
      })
      const data = await r.json()
      const sessions = (data.results || [])
        .filter(row => !projectId || String(row.ProjectID) === String(projectId))
        .map(row => ({
          id:        String(row.id),
          projectId: row.ProjectID,
          clientId:  row.ClientID,
          startTime: row.StartTime,
          endTime:   row.EndTime,
          duration:  parseInt(row.Duration || 0),
          note:      row.Notes || '',
        }))
      return res.status(200).json(sessions)
    }

    if (req.method === 'POST') {
      const body = await readBody(req)
      const r = await fetch(`${base}/?user_field_names=true`, {
        method:  'POST',
        headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ProjectID: body.projectId,
          ClientID:  body.clientId,
          StartTime: body.startTime,
          EndTime:   body.endTime,
          Duration:  body.duration,
          Notes:     body.note || '',
        }),
      })
      const data = await r.json()
      return res.status(r.status).json({
        id:        String(data.id),
        projectId: data.ProjectID,
        clientId:  data.ClientID,
        startTime: data.StartTime,
        endTime:   data.EndTime,
        duration:  parseInt(data.Duration || 0),
        note:      data.Notes || '',
      })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'Missing session id' })
      const r = await fetch(`${base}/${id}/`, {
        method:  'DELETE',
        headers: { Authorization: `Token ${token}` },
      })
      if (r.status === 204) return res.status(200).json({ success: true })
      const data = await r.json()
      return res.status(r.status).json(data)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}