export default async function handler(req, res) {
  const token   = process.env.BASEROW_TOKEN
  const tableId = process.env.BASEROW_SESSIONS_TABLE_ID

  try {
    const r = await fetch(
      `https://api.baserow.io/api/database/rows/table/${tableId}/?user_field_names=true&size=10`,
      { headers: { Authorization: `Token ${token}` } }
    )
    const data = await r.json()
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}