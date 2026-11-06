// api/renfe.js - Serverless function para Vercel (Posiciones + Retrasos en directo)
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const type = (req.query && req.query.type) || 'vehicles';

  try {
    const targetUrl = type === 'trips'
      ? 'https://gtfsrt.renfe.com/trip_updates_LD.json'
      : 'https://gtfsrt.renfe.com/vehicle_positions_LD.json';

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Renfe API status code: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: 'Error al conectar con la API oficial de Renfe',
      message: error.message
    });
  }
};
