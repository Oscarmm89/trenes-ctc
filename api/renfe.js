// api/renfe.js - Serverless Function para Vercel ("TrenYa")
// Agregador resiliente de doble endpoint GTFS-RT de Renfe Open Data (Larga Distancia + Cercanías/MD)

const ENDPOINT_LD = 'https://gtfsrt.renfe.com/vehicle_positions_LD.json';
const ENDPOINT_CERCANIAS = 'https://gtfsrt.renfe.com/vehicle_positions.json';
const FETCH_TIMEOUT_MS = 7000; // Timeout de 7 segundos (rango 6-8s)

async function fetchRenfeEndpoint(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} desde ${url}`);
    }

    const data = await response.json();
    return Array.isArray(data && data.entity) ? data.entity : [];
  } catch (error) {
    // Manejo resiliente: si falla o expira el timeout de este endpoint, devolvemos array vacío
    console.warn(`[TrenYa API] Aviso en fetch (${url}):`, error.message);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req, res) {
  // Encabezados CORS y Cache-Control optimizados para Vercel Edge
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Petición en paralelo a ambos endpoints oficiales de Renfe Open Data
    const [ldEntities, cercaniasEntities] = await Promise.all([
      fetchRenfeEndpoint(ENDPOINT_LD),
      fetchRenfeEndpoint(ENDPOINT_CERCANIAS)
    ]);

    const combinedEntities = [...ldEntities, ...cercaniasEntities];

    return res.status(200).json({
      header: {
        gtfsRealtimeVersion: '2.0',
        incrementality: 'FULL_DATASET',
        timestamp: Math.floor(Date.now() / 1000),
        counts: {
          largaDistancia: ldEntities.length,
          cercaniasMd: cercaniasEntities.length,
          total: combinedEntities.length
        }
      },
      entity: combinedEntities
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error en el agregador GTFS-RT de TrenYa',
      message: error.message,
      entity: []
    });
  }
}
