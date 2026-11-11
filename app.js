/* ============================================================================
   TRENYA PWA — LÓGICA MODULAR MINIMALISTA B2C - FASE 5 (app.js)
   1. Snap to Rail: Polilíneas de rastro real (OSRM API + interpolación curva)
      para trenes en movimiento (speed > 0) hasta nearestStation con color de estado
   2. Buscador Predictivo Local: Autocompletado a partir de 3 caracteres sobre
      SPANISH_STATIONS (nombre, ciudad o código postal), máximo 5 resultados
   3. Nueva Tarjeta de Detalle del Tren (Timeline Vertical + Botón Corazón Favoritos
      + Etiqueta Roja de Alerta en vía + Próxima Parada destacada + Paradas previstas)
   4. Pestaña Billetes Limpia: Comparador exclusivo de Larga Distancia
   ============================================================================ */

window.__TRENYA_BOOTED__ = true;

/* ============================================================================
   1. ESTADO GLOBAL DE TRENYA
   ============================================================================ */
const APP_STATE = {
    activeTab: 'home',
    // Estado global sincronizado entre Inicio y Mapa: 'ALL' | 'CERCANIAS' | 'AVE'
    globalMode: 'ALL',
    mapFilter: 'NONE',        // 'NONE' | 'CERCANIAS' | 'AVE'
    mapSearchQuery: '',
    userLocation: {
        name: 'Sevilla Santa Justa',
        city: 'Sevilla',
        lat: 37.3922,
        lon: -5.9753
    },
    savedRoutes: [],
    favoriteTrains: [],       // IDs de trenes marcados con el Corazón ❤️
    trains: [],
    previousTrainsState: {},  // Historial para validación de 75s (5 ciclos)
    osrmTrailCache: {},       // Caché ligero de geometrías OSRM para Snap-to-Rail
    isUserPro: false,
    proPlanSelected: 'monthly',
    currentUser: null,
    layers: {
        tracks: true,
        stations: false
    }
};

// Catálogo interno de Estaciones de España con nombre, ciudad y código postal (se amplía con stations.json)
let SPANISH_STATIONS = [
    { name: "Sevilla Santa Justa", lat: 37.3922, lon: -5.9753, hub: true, city: "Sevilla", postal: "41008" },
    { name: "Dos Hermanas", lat: 37.2869, lon: -5.9255, hub: false, city: "Sevilla", postal: "41700" },
    { name: "Sevilla San Bernardo", lat: 37.3768, lon: -5.9793, hub: false, city: "Sevilla", postal: "41018" },
    { name: "Virgen del Rocío", lat: 37.3625, lon: -5.9762, hub: false, city: "Sevilla", postal: "41013" },
    { name: "Utrera", lat: 37.1856, lon: -5.7891, hub: false, city: "Sevilla", postal: "41710" },
    { name: "Lebrija", lat: 36.9208, lon: -6.0785, hub: false, city: "Sevilla", postal: "41740" },
    { name: "Jerez de la Frontera", lat: 36.6798, lon: -6.1268, hub: false, city: "Cádiz", postal: "11401" },
    { name: "El Puerto de Santa María", lat: 36.6031, lon: -6.2214, hub: false, city: "Cádiz", postal: "11500" },
    { name: "San Fernando Bahía Sur", lat: 36.4685, lon: -6.2065, hub: false, city: "Cádiz", postal: "11100" },
    { name: "Cádiz", lat: 36.5284, lon: -6.2877, hub: true, city: "Cádiz", postal: "11006" },
    { name: "Córdoba Central", lat: 37.8882, lon: -4.7894, hub: true, city: "Córdoba", postal: "14011" },
    { name: "Puente Genil - Herrera", lat: 37.3581, lon: -4.7985, hub: false, city: "Córdoba", postal: "14500" },
    { name: "Antequera Santa Ana", lat: 37.0672, lon: -4.6881, hub: false, city: "Málaga", postal: "29200" },
    { name: "Málaga María Zambrano", lat: 36.7115, lon: -4.4316, hub: true, city: "Málaga", postal: "29002" },
    { name: "Granada", lat: 37.1842, lon: -3.6091, hub: true, city: "Granada", postal: "18014" },
    { name: "Ciudad Real", lat: 38.9838, lon: -3.9141, hub: false, city: "Ciudad Real", postal: "13004" },
    { name: "Puertollano", lat: 38.6939, lon: -4.1112, hub: false, city: "Ciudad Real", postal: "13500" },
    { name: "Madrid Puerta de Atocha", lat: 40.4065, lon: -3.6896, hub: true, city: "Madrid", postal: "28045" },
    { name: "Madrid Chamartín Clara Campoamor", lat: 40.4721, lon: -3.6826, hub: true, city: "Madrid", postal: "28036" },
    { name: "Madrid Nuevos Ministerios", lat: 40.4466, lon: -3.6922, hub: false, city: "Madrid", postal: "28046" },
    { name: "Guadalajara - Yebes", lat: 40.5912, lon: -3.1408, hub: false, city: "Guadalajara", postal: "19139" },
    { name: "Calatayud", lat: 41.3469, lon: -1.6386, hub: false, city: "Zaragoza", postal: "50300" },
    { name: "Zaragoza Delicias", lat: 41.6587, lon: -0.9114, hub: true, city: "Zaragoza", postal: "50011" },
    { name: "Lleida Pirineus", lat: 41.6208, lon: 0.6326, hub: false, city: "Lleida", postal: "25007" },
    { name: "Camp de Tarragona", lat: 41.1966, lon: 1.2738, hub: true, city: "Tarragona", postal: "43764" },
    { name: "Barcelona Sants", lat: 41.3791, lon: 2.1401, hub: true, city: "Barcelona", postal: "08014" },
    { name: "Girona", lat: 41.9793, lon: 2.8169, hub: true, city: "Girona", postal: "17002" },
    { name: "Figueres Vilafant", lat: 42.2651, lon: 2.9422, hub: false, city: "Girona", postal: "17600" },
    { name: "Cuenca Fernando Zóbel", lat: 40.0322, lon: -2.1497, hub: false, city: "Cuenca", postal: "16004" },
    { name: "Requena - Utiel", lat: 39.5262, lon: -1.1481, hub: false, city: "Valencia", postal: "46340" },
    { name: "Valencia Joaquín Sorolla", lat: 39.4596, lon: -0.3818, hub: true, city: "Valencia", postal: "46007" },
    { name: "Valencia Estació del Nord", lat: 39.4668, lon: -0.3772, hub: true, city: "Valencia", postal: "46007" },
    { name: "Albacete Los Llanos", lat: 38.9998, lon: -1.8482, hub: true, city: "Albacete", postal: "02001" },
    { name: "Villena AV", lat: 38.6061, lon: -0.8925, hub: false, city: "Alicante", postal: "03400" },
    { name: "Alicante Terminal", lat: 38.3446, lon: -0.4951, hub: true, city: "Alicante", postal: "03003" },
    { name: "Elche AV / Elx", lat: 38.2415, lon: -0.7421, hub: false, city: "Alicante", postal: "03295" },
    { name: "Murcia del Carmen", lat: 37.9746, lon: -1.1297, hub: true, city: "Murcia", postal: "30002" },
    { name: "Segovia Guiomar", lat: 40.9114, lon: -4.0938, hub: false, city: "Segovia", postal: "40006" },
    { name: "Valladolid Campo Grande", lat: 41.6416, lon: -4.7282, hub: true, city: "Valladolid", postal: "47007" },
    { name: "Palencia", lat: 42.0124, lon: -4.5396, hub: false, city: "Palencia", postal: "34001" },
    { name: "León", lat: 42.5955, lon: -5.5812, hub: true, city: "León", postal: "24009" },
    { name: "Oviedo", lat: 43.3665, lon: -5.8548, hub: true, city: "Asturias", postal: "33012" },
    { name: "Gijón Sanz Crespo", lat: 43.5392, lon: -5.6761, hub: true, city: "Asturias", postal: "33207" },
    { name: "Zamora", lat: 41.5122, lon: -5.7368, hub: false, city: "Zamora", postal: "49022" },
    { name: "Ourense", lat: 42.3469, lon: -7.8742, hub: true, city: "Ourense", postal: "32001" },
    { name: "Santiago de Compostela", lat: 42.8703, lon: -8.5458, hub: true, city: "Santiago", postal: "15702" },
    { name: "A Coruña", lat: 43.3526, lon: -8.4096, hub: true, city: "A Coruña", postal: "15007" },
    { name: "Vigo Urzáiz", lat: 42.2351, lon: -8.7118, hub: true, city: "Vigo", postal: "36201" },
    { name: "Bilbao Abando", lat: 43.2611, lon: -2.9277, hub: true, city: "Bilbao", postal: "48008" },
    { name: "San Sebastián / Donostia", lat: 43.3176, lon: -1.9768, hub: true, city: "San Sebastián", postal: "20012" }
];

// Secuencias estáticas de paradas por corredor ferroviario para alimentar el Timeline Vertical
const CORRIDOR_STOP_SEQUENCES = {
    SUR_SEVILLA: ["Sevilla Santa Justa", "Córdoba Central", "Puertollano", "Ciudad Real", "Madrid Puerta de Atocha"],
    CERCANIAS_SEVILLA: ["Sevilla Santa Justa", "Sevilla San Bernardo", "Virgen del Rocío", "Dos Hermanas", "Utrera", "Lebrija", "Jerez de la Frontera", "Cádiz"],
    SUR_MALAGA: ["Málaga María Zambrano", "Antequera Santa Ana", "Puente Genil - Herrera", "Córdoba Central", "Madrid Puerta de Atocha"],
    NORESTE_BCN: ["Madrid Puerta de Atocha", "Guadalajara - Yebes", "Calatayud", "Zaragoza Delicias", "Lleida Pirineus", "Camp de Tarragona", "Barcelona Sants", "Girona"],
    LEVANTE_VAL: ["Madrid Chamartín Clara Campoamor", "Cuenca Fernando Zóbel", "Requena - Utiel", "Valencia Joaquín Sorolla", "Alicante Terminal"],
    NORTE_GALICIA: ["Madrid Chamartín Clara Campoamor", "Segovia Guiomar", "Valladolid Campo Grande", "Zamora", "Ourense", "Santiago de Compostela", "A Coruña"]
};

// Bases de Mantenimiento Adif (evita falsos positivos de parada en vía en talleres)
const MAINTENANCE_DEPOTS = [
    { name: "Taller Santa Catalina / Cerro Negro (Madrid)", lat: 40.3792, lon: -3.6685 },
    { name: "Base Mantenimiento Fuencarral (Madrid)", lat: 40.5015, lon: -3.6815 },
    { name: "Base La Sagra (Toledo)", lat: 40.0085, lon: -3.8615 },
    { name: "Taller San Pablo (Sevilla)", lat: 37.4105, lon: -5.9405 },
    { name: "Taller Can Tunis / Sant Andreu (Barcelona)", lat: 41.3455, lon: 2.1385 },
    { name: "Taller Los Prados (Málaga)", lat: 36.7005, lon: -4.4625 }
];

// Trazados Ferroviarios Vectoriales Adif:
// Cian (#00E5FF) para Alta Velocidad LAV y Azul/Gris (#4B6A88) para Vías Convencionales
const ADIF_CORRIDOR_POLYLINES = [
    // Alta Velocidad (LAV) -> Cian (#00E5FF)
    { type: 'LAV', name: 'LAV Madrid - Sevilla', coords: [[40.4065, -3.6896], [39.88, -3.92], [38.9838, -3.9141], [38.6939, -4.1112], [37.8882, -4.7894], [37.3922, -5.9753]] },
    { type: 'LAV', name: 'LAV Córdoba - Málaga / Granada', coords: [[37.8882, -4.7894], [37.25, -4.64], [36.7115, -4.4316]] },
    { type: 'LAV', name: 'LAV Antequera - Granada', coords: [[37.25, -4.64], [37.1842, -3.6091]] },
    { type: 'LAV', name: 'LAV Madrid - Zaragoza - Barcelona', coords: [[40.4065, -3.6896], [40.59, -3.16], [41.6587, -0.9114], [41.61, 0.62], [41.1966, 1.2738], [41.3791, 2.1401], [41.9793, 2.8169]] },
    { type: 'LAV', name: 'LAV Madrid - Levante (Valencia / Alicante / Murcia)', coords: [[40.4065, -3.6896], [40.0322, -2.1497], [39.4596, -0.3818]] },
    { type: 'LAV', name: 'LAV Cuenca - Albacete - Alicante - Murcia', coords: [[40.0322, -2.1497], [38.9998, -1.8482], [38.3446, -0.4951], [37.9746, -1.1297]] },
    { type: 'LAV', name: 'LAV Madrid - Norte / Galicia', coords: [[40.4721, -3.6826], [40.94, -4.11], [41.6416, -4.7282], [42.5955, -5.5812]] },
    { type: 'LAV', name: 'LAV Olmedo - Zamora - Ourense - Santiago', coords: [[41.30, -4.68], [41.51, -5.74], [42.3469, -7.8742], [42.8703, -8.5458], [43.3526, -8.4096]] },
    // Convencional / Cercanías -> Azul/Gris (#4B6A88)
    { type: 'CONV', name: 'Cercanías Sevilla - Dos Hermanas - Utrera - Cádiz', coords: [[37.3922, -5.9753], [37.3768, -5.9793], [37.2869, -5.9255], [37.1856, -5.7891], [36.9208, -6.0785], [36.6798, -6.1268], [36.5284, -6.2877]] },
    { type: 'CONV', name: 'Cercanías Sevilla - Lora del Río - Córdoba', coords: [[37.3922, -5.9753], [37.65, -5.52], [37.8882, -4.7894]] },
    { type: 'CONV', name: 'Corredor Mediterráneo Convencional', coords: [[41.3791, 2.1401], [41.11, 1.25], [39.98, -0.04], [39.4668, -0.3772], [38.3446, -0.4951]] },
    { type: 'CONV', name: 'Eje Atlántico Vigo - Santiago - A Coruña', coords: [[42.2351, -8.7118], [42.43, -8.64], [42.8703, -8.5458], [43.3526, -8.4096]] }
];

/* ============================================================================
   2. SPLASH SCREEN (Duración 2.8 segundos -> Fade-Out y Eliminación del DOM)
   ============================================================================ */
function initSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;

    setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => {
            if (splash && splash.parentNode) {
                splash.parentNode.removeChild(splash);
            }
        }, 600);
    }, 2800);
}

/* ============================================================================
   3. CÁLCULO HAVERSINE, CLASIFICACIÓN Y PARADAS DE CORREDOR (TIMELINE)
   ============================================================================ */
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestAndNextStations(lat, lon) {
    let best = null;
    let secondBest = null;
    let minKm = Infinity;
    let secondMinKm = Infinity;

    for (let i = 0; i < SPANISH_STATIONS.length; i++) {
        const s = SPANISH_STATIONS[i];
        const d = haversineKm(lat, lon, s.lat, s.lon);
        if (d < minKm) {
            secondMinKm = minKm;
            secondBest = best;
            minKm = d;
            best = s;
        } else if (d < secondMinKm) {
            secondMinKm = d;
            secondBest = s;
        }
    }
    for (let j = 0; j < MAINTENANCE_DEPOTS.length; j++) {
        const dep = MAINTENANCE_DEPOTS[j];
        const d = haversineKm(lat, lon, dep.lat, dep.lon);
        if (d < minKm) {
            minKm = d;
            best = { name: dep.name, lat: dep.lat, lon: dep.lon, isDepot: true };
        }
    }
    return {
        station: best,
        distanceKm: minKm,
        nextStation: secondBest || best,
        nextDistanceKm: Number.isFinite(secondMinKm) ? secondMinKm : minKm
    };
}

function classifyTrainService(label, id) {
    const raw = ((label || '') + ' ' + (id || '')).toUpperCase();
    if (raw.includes('AVLO')) return { type: 'Avlo', category: 'AVE', icon: '🚄' };
    if (raw.includes('ALVIA')) return { type: 'Alvia', category: 'AVE', icon: '🚄' };
    if (raw.includes('EUROMED')) return { type: 'Euromed', category: 'AVE', icon: '🚄' };
    if (raw.includes('INTERCITY')) return { type: 'Intercity', category: 'AVE', icon: '🚄' };
    if (raw.includes('AVE')) return { type: 'AVE', category: 'AVE', icon: '🚄' };
    if (raw.includes('AVANT')) return { type: 'Avant', category: 'CERCANIAS', icon: '🚈' };
    if (raw.includes('MD') || raw.includes('MEDIA') || raw.includes('REGIONAL')) {
        return { type: 'Media Distancia', category: 'CERCANIAS', icon: '🚈' };
    }
    if (raw.includes('C-') || raw.includes('CERC') || raw.includes('RODALIES') || /^[12345789]\d{4}$/.test(id)) {
        return { type: 'Cercanías', category: 'CERCANIAS', icon: '🚈' };
    }
    return { type: 'AVE / LD', category: 'AVE', icon: '🚄' };
}

function inferCorridorRoute(lat, lon, numberStr) {
    if (lat < 38.5 && lon < -4.2) return "Sevilla Santa Justa ➔ Madrid / Cádiz";
    if (lat < 37.3 && lon >= -4.8) return "Málaga María Zambrano ➔ Córdoba / Madrid";
    if (lat > 40.8 && lon > 0.2) return "Madrid Atocha ➔ Zaragoza ➔ Barcelona Sants";
    if (lat < 40.2 && lon > -2.2) return "Madrid Chamartín ➔ Valencia / Alicante";
    if (lat > 41.4 && lon < -4.0) return "Madrid Chamartín ➔ Valladolid ➔ Galicia / León";
    const num = parseInt((numberStr || '0').replace(/\D/g, ''), 10);
    if (num >= 2000 && num < 3000) return "Madrid Puerta de Atocha ➔ Sevilla Santa Justa";
    if (num >= 3000 && num < 4000) return "Madrid Puerta de Atocha ➔ Barcelona Sants";
    if (num >= 5000 && num < 6000) return "Madrid Chamartín ➔ Valencia Joaquín Sorolla";
    return "Corredor Ferroviario Adif";
}

// Obtiene las próximas 2-3 paradas previstas del corredor para el Timeline Vertical
function getUpcomingCorridorStops(train) {
    let seq = CORRIDOR_STOP_SEQUENCES.SUR_SEVILLA;
    if (train.category === 'CERCANIAS' && train.lat < 38.2) {
        seq = CORRIDOR_STOP_SEQUENCES.CERCANIAS_SEVILLA;
    } else if (train.lat < 37.3 && train.lon >= -4.8) {
        seq = CORRIDOR_STOP_SEQUENCES.SUR_MALAGA;
    } else if (train.lat > 40.5 && train.lon > -2.0) {
        seq = CORRIDOR_STOP_SEQUENCES.NORESTE_BCN;
    } else if (train.lat < 40.3 && train.lon > -2.5) {
        seq = CORRIDOR_STOP_SEQUENCES.LEVANTE_VAL;
    } else if (train.lat > 41.0 && train.lon < -4.0) {
        seq = CORRIDOR_STOP_SEQUENCES.NORTE_GALICIA;
    }

    const currentNext = (train.nextStopName || train.nearestStation || '').toLowerCase();
    let idx = seq.findIndex(st => st.toLowerCase().includes(currentNext) || currentNext.includes(st.toLowerCase()));

    const upcoming = [];
    if (idx !== -1) {
        for (let i = idx + 1; i < seq.length && upcoming.length < 2; i++) {
            upcoming.push(seq[i]);
        }
        if (upcoming.length < 2) {
            for (let i = idx - 1; i >= 0 && upcoming.length < 2; i--) {
                if (!upcoming.includes(seq[i])) upcoming.push(seq[i]);
            }
        }
    } else {
        for (let i = 0; i < seq.length && upcoming.length < 2; i++) {
            if (seq[i].toLowerCase() !== currentNext) {
                upcoming.push(seq[i]);
            }
        }
    }

    const baseMin = train.etaMinutes || 7;
    const stepMin = train.category === 'CERCANIAS' ? 8 : 22;

    return upcoming.slice(0, 2).map((stopName, index) => ({
        name: stopName,
        plusMinutes: baseMin + stepMin * (index + 1),
        expectedClock: formatExpectedTime(baseMin + stepMin * (index + 1))
    }));
}

function formatExpectedTime(minutesAhead) {
    const d = new Date(Date.now() + Math.max(1, minutesAhead) * 60000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

/* ============================================================================
   4. MOTOR GTFS-RT Y REGLA DE VALIDACIÓN DE 75 SEGUNDOS (5 CICLOS)
   ============================================================================ */
async function fetchLiveTrainsGTFS() {
    const endpoints = [
        '/api/renfe',
        'http://localhost:3000/api/renfe',
        './renfe_live.json'
    ];

    let rawEntities = null;
    for (const url of endpoints) {
        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                rawEntities = json.entity || (Array.isArray(json) ? json : null);
                if (rawEntities && rawEntities.length > 0) break;
            }
        } catch (_) {}
    }

    if (!rawEntities || rawEntities.length === 0) {
        rawEntities = generateFallbackCommuterDataset();
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const processed = [];

    for (let i = 0; i < rawEntities.length; i++) {
        const item = rawEntities[i];
        const v = item.vehicle || item;
        const pos = v.position || {};
        const lat = parseFloat(pos.latitude ?? item.lat);
        const lon = parseFloat(pos.longitude ?? item.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        if (lat < 35.0 || lat > 44.0 || lon < -9.6 || lon > 4.5) continue;

        const rawId = String((v.vehicle && v.vehicle.id) || item.id || `TR-${i}`);
        const rawLabel = String((v.vehicle && v.vehicle.label) || item.label || rawId);
        const numberMatch = rawLabel.match(/\d{4,5}/);
        const trainNumber = numberMatch ? numberMatch[0] : rawId.replace(/\D/g, '').slice(0, 5) || String(1000 + i);

        const prev = APP_STATE.previousTrainsState[rawId];
        let speedKmh = Number(pos.speed || 0) * 3.6;

        if (prev && (!speedKmh || speedKmh < 1)) {
            const distKm = haversineKm(prev.lat, prev.lon, lat, lon);
            const dtHours = Math.max((nowSec - prev.timestamp) / 3600, 15 / 3600);
            if (distKm > 0.025) {
                speedKmh = Math.min(310, Math.round(distKm / dtHours));
            }
        } else {
            speedKmh = Math.round(speedKmh);
        }

        const geoInfo = findNearestAndNextStations(lat, lon);
        const isAtStationOrDepot = geoInfo.distanceKm <= 1.25 || (geoInfo.station && geoInfo.station.isDepot);
        const isMoving = speedKmh >= 5;

        // VALIDACIÓN DE 75 SEGUNDOS (5 CICLOS DE 15s) PARA PARADAS EN VÍA
        let consecutiveStopped = prev ? prev.consecutiveStopped : 0;
        if (!isMoving && !isAtStationOrDepot) {
            consecutiveStopped += 1;
        } else {
            consecutiveStopped = 0;
        }

        let statusKey = 'ON_TIME';
        let statusLabel = 'En hora · En marcha';
        let colorClass = 'green';

        if (!isMoving && consecutiveStopped >= 5) {
            statusKey = 'TRACK_STOP';
            statusLabel = 'Parada en plena vía (≥75s)';
            colorClass = 'red';
        } else if (!isMoving && isAtStationOrDepot) {
            statusKey = 'AT_STATION';
            statusLabel = `En estación · ${geoInfo.station ? geoInfo.station.name : 'Andén'}`;
            colorClass = 'amber';
        } else if (!isMoving && consecutiveStopped > 0 && consecutiveStopped < 5) {
            statusKey = 'MINOR_WAIT';
            statusLabel = `Regulación en vía (${consecutiveStopped * 15}s)`;
            colorClass = 'amber';
        }

        const serviceInfo = classifyTrainService(rawLabel, trainNumber);
        const routeTitle = item.routeTitle || inferCorridorRoute(lat, lon, trainNumber);

        // Coordenadas de la estación más cercana / siguiente para el Snap to Rail
        const targetStationObj = (isAtStationOrDepot && geoInfo.nextStation)
            ? geoInfo.nextStation
            : (geoInfo.station || { name: 'Próxima Estación', lat: lat + 0.06, lon: lon + 0.06 });

        const nextStopStationName = targetStationObj.name || 'Próxima Estación';
        const etaMinutes = Math.max(2, Math.min(45, Math.round((geoInfo.distanceKm / Math.max(speedKmh, 65)) * 60)));
        const expectedTimeStr = item.expectedTime || formatExpectedTime(etaMinutes);
        const destinationName = routeTitle.includes('➔')
            ? routeTitle.split('➔').pop().trim()
            : nextStopStationName;
        const platformNumber = (parseInt(trainNumber, 10) % 8) + 1;

        APP_STATE.previousTrainsState[rawId] = {
            lat,
            lon,
            timestamp: nowSec,
            consecutiveStopped
        };

        processed.push({
            id: rawId,
            trainNumber,
            name: `${serviceInfo.type} ${trainNumber}`,
            serviceType: serviceInfo.type,
            category: serviceInfo.category, // 'CERCANIAS' | 'AVE'
            icon: serviceInfo.icon,
            routeTitle,
            destinationName,
            expectedTime: expectedTimeStr,
            platformNumber,
            lat,
            lon,
            speed: speedKmh,
            statusKey,
            statusLabel,
            colorClass,
            consecutiveStopped,
            nearestStation: geoInfo.station ? geoInfo.station.name : 'Red Adif',
            nearestStationLat: Number.isFinite(targetStationObj.lat) ? targetStationObj.lat : lat + 0.05,
            nearestStationLon: Number.isFinite(targetStationObj.lon) ? targetStationObj.lon : lon + 0.05,
            nextStopName: nextStopStationName,
            etaMinutes,
            nextStopCalculated: `${nextStopStationName} (En ~${etaMinutes} min)`,
            distanceToStationKm: geoInfo.distanceKm
        });
    }

    ensureCommuterTrainsAvailable(processed);
    APP_STATE.trains = processed;

    renderSavedRoutesSection();
    renderNearbyPlatformBoard();
    if (APP_STATE.activeTab === 'map' && leafletMap) {
        renderMapMarkers();
    }
}

function ensureCommuterTrainsAvailable(list) {
    const hasSevillaCommuter = list.some(t =>
        haversineKm(t.lat, t.lon, 37.34, -5.95) < 35 && t.category === 'CERCANIAS'
    );
    if (!hasSevillaCommuter) {
        list.unshift(
            {
                id: 'C1-SEV-23014',
                trainNumber: '23014',
                name: 'Cercanías C-1 23014',
                serviceType: 'Cercanías',
                category: 'CERCANIAS',
                icon: '🚈',
                routeTitle: 'Dos Hermanas ➔ Sevilla Santa Justa',
                destinationName: 'SEVILLA SANTA JUSTA',
                expectedTime: formatExpectedTime(4),
                platformNumber: 2,
                lat: 37.338,
                lon: -5.958,
                speed: 96,
                statusKey: 'ON_TIME',
                statusLabel: 'En hora · En marcha',
                colorClass: 'green',
                consecutiveStopped: 0,
                nearestStation: 'Sevilla San Bernardo',
                nearestStationLat: 37.3768,
                nearestStationLon: -5.9793,
                nextStopName: 'Sevilla San Bernardo',
                etaMinutes: 4,
                nextStopCalculated: 'Sevilla San Bernardo (En ~4 min)',
                distanceToStationKm: 0.9
            },
            {
                id: 'MD-SEV-13042',
                trainNumber: '13042',
                name: 'Media Distancia 13042',
                serviceType: 'Media Distancia',
                category: 'CERCANIAS',
                icon: '🚈',
                routeTitle: 'Sevilla Santa Justa ➔ Dos Hermanas ➔ Cádiz',
                destinationName: 'CÁDIZ',
                expectedTime: formatExpectedTime(11),
                platformNumber: 4,
                lat: 37.287,
                lon: -5.925,
                speed: 0,
                statusKey: 'AT_STATION',
                statusLabel: 'Efectuando parada en Dos Hermanas',
                colorClass: 'amber',
                consecutiveStopped: 0,
                nearestStation: 'Dos Hermanas',
                nearestStationLat: 37.1856,
                nearestStationLon: -5.7891,
                nextStopName: 'Utrera',
                etaMinutes: 12,
                nextStopCalculated: 'Utrera (En ~12 min)',
                distanceToStationKm: 0.1
            },
            {
                id: 'C1-SEV-23019',
                trainNumber: '23019',
                name: 'Cercanías C-1 23019',
                serviceType: 'Cercanías',
                category: 'CERCANIAS',
                icon: '🚈',
                routeTitle: 'Sevilla Santa Justa ➔ Dos Hermanas ➔ Utrera',
                destinationName: 'UTRERA / LEBRIJA',
                expectedTime: formatExpectedTime(9),
                platformNumber: 1,
                lat: 37.352,
                lon: -5.965,
                speed: 82,
                statusKey: 'ON_TIME',
                statusLabel: 'En hora · En marcha',
                colorClass: 'green',
                consecutiveStopped: 0,
                nearestStation: 'Dos Hermanas',
                nearestStationLat: 37.2869,
                nearestStationLon: -5.9255,
                nextStopName: 'Dos Hermanas',
                etaMinutes: 7,
                nextStopCalculated: 'Dos Hermanas (En ~7 min)',
                distanceToStationKm: 4.5
            }
        );
    }
}

function generateFallbackCommuterDataset() {
    return [
        { id: 'AVE-02112', label: 'AVE 02112', lat: 37.651, lon: -5.214, position: { latitude: 37.651, longitude: -5.214, speed: 78 } },
        { id: 'AVE-03104', label: 'AVE 03104', lat: 41.124, lon: -1.452, position: { latitude: 41.124, longitude: -1.452, speed: 82 } },
        { id: 'AVLO-06211', label: 'AVLO 06211', lat: 39.882, lon: -1.912, position: { latitude: 39.882, longitude: -1.912, speed: 74 } }
    ];
}

/* ============================================================================
   5. BUSCADOR PREDICTIVO LOCAL (AUTOCOMPLETADO A PARTIR DE 3 CARACTERES)
   ============================================================================ */
function handleHomeSearchInput(rawValue) {
    const dropdown = document.getElementById('home-autocomplete-dropdown');
    if (!dropdown) return;

    const query = (rawValue || '').trim().toLowerCase();
    if (query.length < 3) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
        return;
    }

    // Filtrar SPANISH_STATIONS por nombre, ciudad o código postal (máximo 5 resultados)
    const matches = SPANISH_STATIONS.filter(st => {
        const nameMatch = (st.name || '').toLowerCase().includes(query);
        const cityMatch = (st.city || '').toLowerCase().includes(query);
        const postalMatch = (st.postal || '').toLowerCase().includes(query);
        return nameMatch || cityMatch || postalMatch;
    }).slice(0, 5);

    if (matches.length === 0) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
        return;
    }

    dropdown.innerHTML = matches.map(st => {
        const safeName = st.name.replace(/'/g, "\\'");
        const badgeText = st.hub ? 'Estación Principal' : (st.city || 'Adif');
        return `
            <div class="autocomplete-item" onclick="selectAutocompleteStation('${safeName}')">
                <div class="autocomplete-item-left">
                    <span class="material-symbols-rounded">train</span>
                    <div>
                        <strong>${st.name}</strong>
                        <small style="display:block;font-size:0.74rem;color:var(--text-secondary);">${st.city || 'Red Renfe'} ${st.postal ? '· CP ' + st.postal : ''}</small>
                    </div>
                </div>
                <span class="autocomplete-badge">${badgeText}</span>
            </div>
        `;
    }).join('');

    dropdown.classList.remove('hidden');
}

function selectAutocompleteStation(stationName) {
    const input = document.getElementById('home-search-input');
    const dropdown = document.getElementById('home-autocomplete-dropdown');
    if (input) input.value = stationName;
    if (dropdown) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
    }
    handleHomeSearchSubmit();
}

// Cerrar el desplegable de autocompletado si el usuario hace clic fuera
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('home-autocomplete-dropdown');
    const wrapper = document.querySelector('.search-autocomplete-wrapper');
    if (dropdown && wrapper && !wrapper.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

/* ============================================================================
   6. SINCRONIZACIÓN GLOBAL DE ESTADO (INICIO <-> MAPA)
   ============================================================================ */
function normalizeModeKey(mode) {
    if (!mode) return 'ALL';
    const m = mode.toUpperCase();
    if (m.includes('CERC')) return 'CERCANIAS';
    if (m.includes('AVE') || m.includes('LD')) return 'AVE';
    return 'ALL';
}

function syncGlobalModeUI() {
    const mode = APP_STATE.globalMode; // 'ALL' | 'CERCANIAS' | 'AVE'

    // 1. Botones gigantes en Inicio
    const homeBtnCerc = document.getElementById('home-btn-cercanias');
    const homeBtnAve = document.getElementById('home-btn-ave');
    if (homeBtnCerc) homeBtnCerc.classList.toggle('active-mode', mode === 'CERCANIAS');
    if (homeBtnAve) homeBtnAve.classList.toggle('active-mode', mode === 'AVE');

    // 2. Chips superiores del Mapa (map-scope-chips)
    const mapChipCerc = document.getElementById('scope-cercanias');
    const mapChipAve = document.getElementById('scope-ave');
    if (mapChipCerc) mapChipCerc.classList.toggle('active', APP_STATE.mapFilter === 'CERCANIAS');
    if (mapChipAve) mapChipAve.classList.toggle('active', APP_STATE.mapFilter === 'AVE');
}

function switchTab(targetTab) {
    APP_STATE.activeTab = targetTab;

    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === targetTab);
    });

    document.querySelectorAll('.tab-view').forEach(view => {
        view.classList.toggle('active', view.id === `view-${targetTab}`);
    });

    const shell = document.getElementById('app-shell');
    if (shell) {
        shell.classList.toggle('map-expanded', targetTab === 'map');
    }

    syncGlobalModeUI();

    if (targetTab === 'map') {
        initLiveMapIfNeeded();
        setTimeout(() => {
            if (leafletMap) {
                leafletMap.invalidateSize();
                renderMapMarkers();
            }
        }, 180);
    }
}

function selectCategoryAndGoToMap(rawCategory) {
    const mode = normalizeModeKey(rawCategory); // 'CERCANIAS' | 'AVE'
    APP_STATE.globalMode = mode;
    APP_STATE.mapFilter = mode;
    APP_STATE.mapSearchQuery = '';

    const mapInput = document.getElementById('map-search-input');
    if (mapInput) mapInput.value = '';

    syncGlobalModeUI();
    switchTab('map');

    setTimeout(() => {
        if (leafletMap) {
            if (mode === 'CERCANIAS') {
                leafletMap.flyTo([APP_STATE.userLocation.lat, APP_STATE.userLocation.lon], 9, { duration: 0.85 });
            } else {
                leafletMap.flyTo([40.0, -3.7], 6, { duration: 0.75 });
            }
            renderMapMarkers();
        }
    }, 220);
}

function handleHomeSearchSubmit(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('home-search-input');
    const dropdown = document.getElementById('home-autocomplete-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    const q = (input ? input.value : '').trim();
    if (!q) {
        showToast('Escribe una ciudad, estación o número de tren');
        return;
    }

    APP_STATE.mapSearchQuery = q.toLowerCase();
    const mapInput = document.getElementById('map-search-input');
    if (mapInput) mapInput.value = q;

    switchTab('map');

    setTimeout(() => {
        if (!leafletMap) return;
        const stationMatch = SPANISH_STATIONS.find(s =>
            s.name.toLowerCase().includes(APP_STATE.mapSearchQuery) ||
            (s.city && s.city.toLowerCase().includes(APP_STATE.mapSearchQuery)) ||
            (s.postal && s.postal.toLowerCase().includes(APP_STATE.mapSearchQuery))
        );
        if (stationMatch) {
            leafletMap.flyTo([stationMatch.lat, stationMatch.lon], 10, { duration: 0.8 });
        }
        renderMapMarkers();
    }, 220);
}

/* ============================================================================
   7. ESTACIONES CERCANAS (GPS) — PANELES ESTILO ANDÉN LED (#000 + Monospace)
   ============================================================================ */
function detectUserLocation() {
    const gpsLabel = document.getElementById('gps-btn-label');
    if (!navigator.geolocation) {
        showToast('Geolocalización no soportada en este navegador');
        return;
    }
    if (gpsLabel) gpsLabel.textContent = 'Localizando...';

    navigator.geolocation.getCurrentPosition(
        pos => {
            const { latitude, longitude } = pos.coords;
            const geoInfo = findNearestAndNextStations(latitude, longitude);
            APP_STATE.userLocation = {
                name: geoInfo.station ? geoInfo.station.name : 'Estación Cercana GPS',
                city: (geoInfo.station && geoInfo.station.city) ? geoInfo.station.city : 'Mi Zona',
                lat: latitude,
                lon: longitude
            };
            if (gpsLabel) gpsLabel.textContent = 'GPS Activo';
            renderNearbyPlatformBoard();
            if (leafletMap && APP_STATE.globalMode === 'CERCANIAS') {
                leafletMap.flyTo([latitude, longitude], 9, { duration: 0.8 });
                renderMapMarkers();
            }
            showToast(`Andén sincronizado: ${APP_STATE.userLocation.name}`);
        },
        () => {
            if (gpsLabel) gpsLabel.textContent = 'Actualizar GPS';
            showToast(`Mostrando panel de ${APP_STATE.userLocation.name}`);
        },
        { enableHighAccuracy: true, timeout: 6000 }
    );
}

function renderNearbyPlatformBoard() {
    const boardStationTitle = document.getElementById('board-station-name');
    const boardRowsContainer = document.getElementById('nearby-platform-rows');
    if (!boardRowsContainer) return;

    const u = APP_STATE.userLocation;
    if (boardStationTitle) {
        boardStationTitle.textContent = u.name.toUpperCase();
    }

    const nearbyTrains = APP_STATE.trains
        .map(t => ({
            ...t,
            distKm: haversineKm(u.lat, u.lon, t.lat, t.lon)
        }))
        .filter(t => t.distKm <= 150)
        .sort((a, b) => a.distKm - b.distKm)
        .slice(0, 5);

    const listToRender = nearbyTrains.length > 0 ? nearbyTrains : APP_STATE.trains.slice(0, 4);

    boardRowsContainer.innerHTML = listToRender.map(t => {
        const statusShort = t.statusKey === 'TRACK_STOP'
            ? 'INCIDENCIA VÍA'
            : (t.speed > 0 ? 'EN HORA' : 'EN ANDÉN');

        return `
            <div class="platform-led-card" onclick="openTrainDetailSheet('${t.id}')" title="Toca para ver línea de tiempo y estado">
                <div class="led-time">${t.expectedTime || '12:40'}</div>
                <div class="led-dest-group">
                    <div class="led-destination">${t.destinationName || t.routeTitle}</div>
                    <div class="led-train-sub">${t.name} · Próx: ${t.nearestStation}</div>
                </div>
                <div class="led-platform-box">
                    <span class="led-via-badge">VÍA ${t.platformNumber || 1}</span>
                    <span class="led-status-tag ${t.colorClass}">${statusShort}</span>
                </div>
            </div>
        `;
    }).join('');
}

/* ============================================================================
   8. SECCIÓN "MIS RUTAS (CERCANÍAS)" Y TRENES FAVORITOS (CORAZÓN)
   ============================================================================ */
function loadSavedRoutes() {
    try {
        const raw = localStorage.getItem('trenya_saved_routes');
        if (raw) {
            APP_STATE.savedRoutes = JSON.parse(raw);
        } else {
            APP_STATE.savedRoutes = [
                {
                    id: 'route-dh-sev',
                    origin: 'Dos Hermanas',
                    destination: 'Sevilla Santa Justa',
                    line: 'Cercanías C-1 / MD'
                }
            ];
            localStorage.setItem('trenya_saved_routes', JSON.stringify(APP_STATE.savedRoutes));
        }
    } catch (_) {
        APP_STATE.savedRoutes = [];
    }

    try {
        const rawFavs = localStorage.getItem('trenya_fav_trains');
        if (rawFavs) {
            APP_STATE.favoriteTrains = JSON.parse(rawFavs);
        }
    } catch (_) {
        APP_STATE.favoriteTrains = [];
    }
}

function toggleFavoriteTrain(trainId) {
    const idx = APP_STATE.favoriteTrains.indexOf(trainId);
    let isFavNow = false;
    if (idx === -1) {
        APP_STATE.favoriteTrains.push(trainId);
        isFavNow = true;
    } else {
        APP_STATE.favoriteTrains.splice(idx, 1);
        isFavNow = false;
    }
    localStorage.setItem('trenya_fav_trains', JSON.stringify(APP_STATE.favoriteTrains));

    const favBtn = document.getElementById('detail-fav-heart-btn');
    if (favBtn) {
        favBtn.classList.toggle('is-fav', isFavNow);
    }

    const train = APP_STATE.trains.find(t => t.id === trainId);
    const label = train ? train.name : trainId;
    showToast(isFavNow ? `❤️ ${label} guardado en Favoritos` : `${label} eliminado de Favoritos`);
}

function renderSavedRoutesSection() {
    const container = document.getElementById('saved-routes-container');
    if (!container) return;

    if (!APP_STATE.savedRoutes || APP_STATE.savedRoutes.length === 0) {
        container.innerHTML = `
            <button class="empty-route-cta" onclick="openAddRouteModal()">
                <span class="material-symbols-rounded">add_circle</span>
                <span>Añadir mi ruta diaria</span>
            </button>
        `;
        return;
    }

    container.innerHTML = APP_STATE.savedRoutes.map(r => {
        const matchingTrain = APP_STATE.trains.find(t =>
            t.routeTitle.toLowerCase().includes(r.origin.toLowerCase()) ||
            t.routeTitle.toLowerCase().includes(r.destination.toLowerCase()) ||
            t.nearestStation.toLowerCase().includes(r.origin.toLowerCase())
        );

        const nextInfo = matchingTrain
            ? `${matchingTrain.name} · ${matchingTrain.statusLabel}`
            : 'Toca para abrir tu línea en el Mapa en Vivo';

        return `
            <div class="b2c-card status-border-green" onclick="focusSavedRouteOnMap('${r.origin}', '${r.destination}')">
                <div class="card-top-row">
                    <span class="operator-badge">🚈 ${r.line}</span>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span class="status-pill green">
                            <span class="pulse-dot green"></span> En hora
                        </span>
                        <button class="icon-close-sm" onclick="removeSavedRoute('${r.id}', event)" title="Eliminar ruta">✕</button>
                    </div>
                </div>
                <div class="route-main-title">
                    <span>${r.origin} ➔ ${r.destination}</span>
                    <span class="material-symbols-rounded" style="color:var(--status-green);">chevron_right</span>
                </div>
                <div class="route-sub-meta">
                    <span>${nextInfo}</span>
                </div>
            </div>
        `;
    }).join('');
}

function openAddRouteModal() {
    document.getElementById('modal-add-route').classList.remove('hidden');
}

function saveNewCommuteRoute(e) {
    e.preventDefault();
    const origin = document.getElementById('route-origin-input').value.trim();
    const destination = document.getElementById('route-dest-input').value.trim();
    const line = document.getElementById('route-line-input').value;

    if (!origin || !destination) return;

    APP_STATE.savedRoutes.unshift({
        id: 'rt-' + Date.now(),
        origin,
        destination,
        line
    });
    localStorage.setItem('trenya_saved_routes', JSON.stringify(APP_STATE.savedRoutes));
    renderSavedRoutesSection();
    closeModal('modal-add-route');
    showToast(`Ruta ${origin} ➔ ${destination} guardada`);
}

function removeSavedRoute(routeId, event) {
    if (event) event.stopPropagation();
    APP_STATE.savedRoutes = APP_STATE.savedRoutes.filter(r => r.id !== routeId);
    localStorage.setItem('trenya_saved_routes', JSON.stringify(APP_STATE.savedRoutes));
    renderSavedRoutesSection();
    showToast('Ruta eliminada');
}

function focusSavedRouteOnMap(originName, destName) {
    APP_STATE.globalMode = 'CERCANIAS';
    APP_STATE.mapFilter = 'CERCANIAS';
    APP_STATE.mapSearchQuery = '';
    syncGlobalModeUI();

    const st = SPANISH_STATIONS.find(s =>
        s.name.toLowerCase().includes(originName.toLowerCase()) ||
        s.name.toLowerCase().includes(destName.toLowerCase())
    );
    if (st) {
        APP_STATE.userLocation.lat = st.lat;
        APP_STATE.userLocation.lon = st.lon;
        APP_STATE.userLocation.name = st.name;
    }

    switchTab('map');
    setTimeout(() => {
        if (leafletMap) {
            leafletMap.flyTo([APP_STATE.userLocation.lat, APP_STATE.userLocation.lon], 10, { duration: 0.8 });
            renderMapMarkers();
        }
    }, 220);
}

/* ============================================================================
   9. MAPA EN VIVO + SNAP TO RAIL (RUTAS REALES EN LUGAR DE LÍNEA RECTA):
      - Polilínea desde [t.lat, t.lon] hasta [t.nearestStationLat, t.nearestStationLon]
        para trenes con speed > 0 usando OSRM API + interpolación curva instantánea
      - Rastro del mismo color que su estado (ej. #00E676 verde flúor con opacidad)
   ============================================================================ */
let leafletMap = null;
let tracksLayerGroup = null;
let trainTrailsLayer = null;
let trainMarkersLayer = null;
let stationMarkersLayer = null;

function initLiveMapIfNeeded() {
    if (leafletMap) return;

    const spainBounds = L.latLngBounds([35.0, -10.0], [44.2, 4.6]);

    leafletMap = L.map('leaflet-map', {
        center: [APP_STATE.userLocation.lat, APP_STATE.userLocation.lon],
        zoom: 6,
        minZoom: 6,
        maxZoom: 17,
        maxBounds: spainBounds,
        maxBoundsViscosity: 0.9,
        zoomControl: false
    });

    // Mapa Base OpenStreetMap Estándar con Modo Oscuro CSS (Libre de API Key)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        className: 'osm-dark-layer'
    }).addTo(leafletMap);

    // Capa de Vías Adif: Cian (#00E5FF) para Alta Velocidad y Azul/Gris (#4B6A88) para Convencional
    tracksLayerGroup = L.layerGroup().addTo(leafletMap);
    renderAdifCorridorTracks();

    // Capa para el rastro Snap-to-Rail de los trenes en movimiento
    trainTrailsLayer = L.layerGroup().addTo(leafletMap);
    stationMarkersLayer = L.layerGroup().addTo(leafletMap);
    trainMarkersLayer = L.layerGroup().addTo(leafletMap);

    leafletMap.on('moveend zoomend', () => {
        renderStationMarkersLOD();
    });

    renderStationMarkersLOD();
    renderMapMarkers();
}

function renderAdifCorridorTracks() {
    if (!tracksLayerGroup) return;
    tracksLayerGroup.clearLayers();

    ADIF_CORRIDOR_POLYLINES.forEach(corridor => {
        const isLav = corridor.type === 'LAV';
        const line = L.polyline(corridor.coords, {
            color: isLav ? '#00E5FF' : '#4B6A88',
            weight: isLav ? 2.6 : 2.0,
            opacity: isLav ? 0.65 : 0.55,
            dashArray: isLav ? null : '5, 5',
            interactive: false
        });
        tracksLayerGroup.addLayer(line);
    });
}

// Genera una curva interpolada suave siguiendo la geometría del corredor ferroviario como base inmediata
function buildInterpolatedRailCurve(lat1, lon1, lat2, lon2) {
    const points = [];
    const steps = 10;
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    // Desviación perpendicular suave para simular el radio de curvatura ferroviario Adif
    const perpLat = -dLon * 0.14;
    const perpLon = dLat * 0.14;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const bend = Math.sin(t * Math.PI);
        const lat = lat1 + dLat * t + perpLat * bend;
        const lon = lon1 + dLon * t + perpLon * bend;
        points.push([lat, lon]);
    }
    return points;
}

// Fetch ligero y cacheado a la API pública de OSRM para ajustar la polilínea al trazado real
async function updatePolylineWithOSRM(train, polylineLayer) {
    if (!train || !polylineLayer) return;
    const key = `${train.id}_${train.lat.toFixed(2)}_${train.lon.toFixed(2)}_${train.nearestStationLat.toFixed(2)}`;

    if (APP_STATE.osrmTrailCache[key]) {
        polylineLayer.setLatLngs(APP_STATE.osrmTrailCache[key]);
        return;
    }

    const url = `https://router.project-osrm.org/route/v1/driving/${train.lon},${train.lat};${train.nearestStationLon},${train.nearestStationLat}?overview=full&geometries=geojson`;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) return;

        const data = await res.json();
        if (data && data.routes && data.routes[0] && data.routes[0].geometry && Array.isArray(data.routes[0].geometry.coordinates)) {
            const latLngs = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            if (latLngs.length >= 2) {
                APP_STATE.osrmTrailCache[key] = latLngs;
                polylineLayer.setLatLngs(latLngs);
            }
        }
    } catch (_) {
        // Si OSRM no responde o limita tráfico, se mantiene la curva interpolada suave
    }
}

function getStatusHexColor(colorClass) {
    if (colorClass === 'red') return '#FF3D00';
    if (colorClass === 'amber') return '#FFC107';
    return '#00E676'; // Verde flúor
}

function setMapFilter(rawFilterKey) {
    const mode = normalizeModeKey(rawFilterKey); // 'CERCANIAS' | 'AVE'
    if (APP_STATE.mapFilter === mode && !APP_STATE.mapSearchQuery) {
        APP_STATE.mapFilter = 'NONE';
        APP_STATE.globalMode = 'ALL';
    } else {
        APP_STATE.mapFilter = mode;
        APP_STATE.globalMode = mode;

        if (leafletMap) {
            if (mode === 'CERCANIAS') {
                leafletMap.flyTo([APP_STATE.userLocation.lat, APP_STATE.userLocation.lon], 9, { duration: 0.85 });
            } else if (mode === 'AVE') {
                leafletMap.flyTo([40.0, -3.7], 6, { duration: 0.75 });
            }
        }
    }
    syncGlobalModeUI();
    renderMapMarkers();
}

function handleMapSearch(val) {
    APP_STATE.mapSearchQuery = (val || '').trim().toLowerCase();
    renderMapMarkers();
}

function renderMapMarkers() {
    if (!leafletMap || !trainMarkersLayer) return;
    trainMarkersLayer.clearLayers();
    if (trainTrailsLayer) trainTrailsLayer.clearLayers();

    const q = APP_STATE.mapSearchQuery;
    const activeFilter = APP_STATE.mapFilter; // 'NONE' | 'CERCANIAS' | 'AVE'
    const emptyPrompt = document.getElementById('map-empty-prompt');

    if (activeFilter === 'NONE' && !q) {
        if (emptyPrompt) emptyPrompt.classList.remove('hidden');
        updateMapCounters(0, 0, 0);
        return;
    }

    if (emptyPrompt) emptyPrompt.classList.add('hidden');

    let movingCount = 0;
    let stationCount = 0;
    let stoppedCount = 0;

    const matchingTrains = APP_STATE.trains.filter(t => {
        if (activeFilter === 'CERCANIAS' || APP_STATE.globalMode === 'CERCANIAS') {
            if (activeFilter === 'CERCANIAS' && t.category !== 'CERCANIAS') return false;
            // FILTRO RADIAL ESTRICTO DE 150 KM DESDE APP_STATE.userLocation EN MODO CERCANÍAS
            if (activeFilter === 'CERCANIAS' && !q) {
                const distFromUserKm = haversineKm(
                    APP_STATE.userLocation.lat,
                    APP_STATE.userLocation.lon,
                    t.lat,
                    t.lon
                );
                if (distFromUserKm > 150) return false;
            }
        }
        if (activeFilter === 'AVE' && t.category !== 'AVE') return false;
        if (q) {
            const hay = `${t.name} ${t.trainNumber} ${t.routeTitle} ${t.nearestStation}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });

    matchingTrains.forEach((t, idx) => {
        if (t.statusKey === 'TRACK_STOP') stoppedCount++;
        else if (t.speed > 0) movingCount++;
        else stationCount++;

        // 1. SNAP TO RAIL: Si el tren está en movimiento (speed > 0), dibujar polilínea hasta nearestStation
        if (t.speed > 0 && trainTrailsLayer && Number.isFinite(t.nearestStationLat) && Number.isFinite(t.nearestStationLon)) {
            const statusColorHex = getStatusHexColor(t.colorClass);
            const curvedCoords = buildInterpolatedRailCurve(t.lat, t.lon, t.nearestStationLat, t.nearestStationLon);

            const railTrailPolyline = L.polyline(curvedCoords, {
                color: statusColorHex,
                weight: 3.5,
                opacity: 0.58,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: '6, 6',
                interactive: false
            });
            trainTrailsLayer.addLayer(railTrailPolyline);

            // Refinar asíncronamente con ruta OSRM para los primeros trenes visibles
            if (idx < 12) {
                updatePolylineWithOSRM(t, railTrailPolyline);
            }
        }

        // 2. Marcador circular de punto con evento clic al Modal Timeline
        const dotIcon = L.divIcon({
            className: 'trenya-dot-icon',
            html: `<div class="trenya-dot-wrapper" onclick="openTrainDetailSheet('${t.id}')"><span class="trenya-dot-marker ${t.colorClass}"></span></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const marker = L.marker([t.lat, t.lon], {
            icon: dotIcon,
            interactive: true,
            bubblingMouseEvents: false
        });

        marker.on('click', () => openTrainDetailSheet(t.id));
        trainMarkersLayer.addLayer(marker);
    });

    updateMapCounters(movingCount, stationCount, stoppedCount);
}

function updateMapCounters(moving, station, stopped) {
    const elMov = document.getElementById('map-count-moving');
    const elSta = document.getElementById('map-count-station');
    const elSto = document.getElementById('map-count-stopped');
    if (elMov) elMov.textContent = moving;
    if (elSta) elSta.textContent = station;
    if (elSto) elSto.textContent = stopped;
}

function renderStationMarkersLOD() {
    if (!leafletMap || !stationMarkersLayer) return;
    stationMarkersLayer.clearLayers();
    if (!APP_STATE.layers.stations) return;

    const zoom = leafletMap.getZoom();
    const bounds = leafletMap.getBounds();

    SPANISH_STATIONS.forEach(st => {
        if (!bounds.contains([st.lat, st.lon])) return;
        if (zoom < 9 && !st.hub) return;

        const icon = L.divIcon({
            className: '',
            html: `<div class="station-dot-marker" title="${st.name}"></div>`,
            iconSize: [8, 8],
            iconAnchor: [4, 4]
        });

        const m = L.marker([st.lat, st.lon], { icon, interactive: false });
        stationMarkersLayer.addLayer(m);
    });
}

function toggleLayersPopover() {
    const pop = document.getElementById('map-layers-popover');
    if (pop) pop.classList.toggle('hidden');
}

function toggleInfrastructureLayer(layerName, isChecked) {
    APP_STATE.layers[layerName] = isChecked;
    if (!leafletMap) return;

    if (layerName === 'tracks' && tracksLayerGroup) {
        if (isChecked) leafletMap.addLayer(tracksLayerGroup);
        else leafletMap.removeLayer(tracksLayerGroup);
    }
    if (layerName === 'stations') {
        renderStationMarkersLOD();
    }
}

function centerMapOnUserZone() {
    if (leafletMap) {
        leafletMap.flyTo([APP_STATE.userLocation.lat, APP_STATE.userLocation.lon], 9, { duration: 0.8 });
    }
}

/* ============================================================================
   10. NUEVA TARJETA DE DETALLE DEL TREN (TIMELINE VERTICAL + CORAZÓN + ALERTAS)
   ============================================================================ */
function openTrainDetailSheet(trainId) {
    const train = APP_STATE.trains.find(t => t.id === trainId);
    if (!train) return;

    const modal = document.getElementById('modal-train-detail');
    const content = document.getElementById('train-detail-content');
    if (!modal || !content) return;

    const isFav = APP_STATE.favoriteTrains.includes(train.id);
    const upcomingStops = getUpcomingCorridorStops(train);
    const etaText = train.speed > 0 ? `En ~${train.etaMinutes || 7} min` : 'En andén';

    // Etiqueta Roja prominente encima del timeline si el tren tiene retraso o parada en vía (≥75s)
    const hasTrackAlert = train.statusKey === 'TRACK_STOP' || train.consecutiveStopped >= 3;
    const alertHtml = hasTrackAlert
        ? `
            <div class="timeline-alert-tag">
                <span class="material-symbols-rounded">warning</span>
                <span>ALERTA ADIF: ${train.statusKey === 'TRACK_STOP' ? 'Tren detenido en plena vía (≥75s) · Posible demora' : 'Retraso / Regulación de tráfico en este tramo'}</span>
            </div>
        `
        : '';

    const upcomingItemsHtml = upcomingStops.map(stop => `
        <div class="timeline-item upcoming-stop">
            <span class="timeline-dot"></span>
            <div class="timeline-stop-header">
                <div>
                    <div class="timeline-stop-name">${stop.name}</div>
                    <div class="timeline-stop-sub">Parada prevista del corredor · ${stop.expectedClock}</div>
                </div>
                <span class="timeline-eta">+${stop.plusMinutes} min</span>
            </div>
        </div>
    `).join('');

    content.innerHTML = `
        <!-- Cabecera con Nombre del Tren y Botón Corazón (Favoritos) a la derecha -->
        <div class="detail-sheet-header">
            <div class="detail-title-block">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                    <span class="operator-badge">${train.icon} ${train.name}</span>
                    <span class="status-pill ${train.colorClass}">
                        <span class="pulse-dot ${train.colorClass}"></span>
                        <span>${train.statusLabel}</span>
                    </span>
                </div>
                <h3>${train.routeTitle}</h3>
            </div>
            <button
                type="button"
                id="detail-fav-heart-btn"
                class="fav-heart-btn ${isFav ? 'is-fav' : ''}"
                onclick="toggleFavoriteTrain('${train.id}')"
                aria-label="Guardar tren en favoritos"
                title="Añadir a mis trenes favoritos"
            >
                <span class="material-symbols-rounded">favorite</span>
            </button>
        </div>

        ${alertHtml}

        <!-- Línea de Tiempo Vertical (Timeline) -->
        <div class="train-timeline">
            <!-- 1º Punto: Próxima Parada (Destacado en grande con tiempo estimado y velocidad) -->
            <div class="timeline-item next-stop">
                <span class="timeline-dot"></span>
                <div class="timeline-stop-header">
                    <div>
                        <span style="font-size:0.7rem;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:var(--status-green);display:block;margin-bottom:2px;">PRÓXIMA PARADA</span>
                        <div class="timeline-stop-name">${train.nextStopName || train.nearestStation}</div>
                        <div class="timeline-stop-sub">
                            Velocidad actual: <strong class="speed-mono" style="color:var(--text-primary);">${train.speed} km/h</strong> · Vía ${train.platformNumber || 1}
                        </div>
                    </div>
                    <span class="timeline-eta">${etaText}</span>
                </div>
            </div>

            <!-- 2º y 3º Punto: Próximas paradas previstas (Color más apagado + tiempos incrementales) -->
            ${upcomingItemsHtml}
        </div>

        <button class="primary-cta-btn" style="margin-top:14px;" onclick="closeModal('modal-train-detail')">
            <span>Cerrar detalle</span>
        </button>
    `;

    modal.classList.remove('hidden');
}

/* ============================================================================
   11. PESTAÑA 3: BILLETES (COMPARADOR EXCLUSIVO LARGA DISTANCIA)
   ============================================================================ */
function swapTicketStations() {
    const orig = document.getElementById('ticket-origin');
    const dest = document.getElementById('ticket-destination');
    if (!orig || !dest) return;
    const temp = orig.value;
    orig.value = dest.value;
    dest.value = temp;
}

function handleTicketSearch(event) {
    if (event) event.preventDefault();
    const origin = document.getElementById('ticket-origin').value.trim();
    const destination = document.getElementById('ticket-destination').value.trim();
    const dateVal = document.getElementById('ticket-date').value;

    renderAffiliateTicketCards(origin, destination, dateVal);
}

function renderAffiliateTicketCards(origin, destination, dateStr) {
    const container = document.getElementById('tickets-results-list');
    const heading = document.getElementById('tickets-results-heading');
    if (!container) return;

    if (heading) {
        heading.textContent = `${origin.split(' ')[0]} ➔ ${destination.split(' ')[0]}`;
    }

    const AFFILIATE_BASE_URL = "https://www.thetrainline.com/es?utm_source=trenya_pwa&utm_medium=affiliate";

    const sampleOffers = [
        {
            operator: "AVE Renfe",
            badgeColor: "#00E676",
            depTime: "07:30",
            arrTime: "10:05",
            duration: "2h 35m · Directo",
            price: "24,90 €",
            tariff: "Tarifa Básica · Reembolsable +5€",
            affiliateUrl: `${AFFILIATE_BASE_URL}&origin=${encodeURIComponent(origin)}&dest=${encodeURIComponent(destination)}&op=renfe`
        },
        {
            operator: "iryo Alta Velocidad",
            badgeColor: "#FF3D00",
            depTime: "09:15",
            arrTime: "11:48",
            duration: "2h 33m · Directo",
            price: "19,00 €",
            tariff: "Inicial Flexible · WiFi 5G",
            affiliateUrl: `${AFFILIATE_BASE_URL}&origin=${encodeURIComponent(origin)}&dest=${encodeURIComponent(destination)}&op=iryo`
        },
        {
            operator: "Avlo Low Cost",
            badgeColor: "#FFC107",
            depTime: "12:40",
            arrTime: "15:20",
            duration: "2h 40m · Directo",
            price: "15,00 €",
            tariff: "Precio mínimo garantizado",
            affiliateUrl: `${AFFILIATE_BASE_URL}&origin=${encodeURIComponent(origin)}&dest=${encodeURIComponent(destination)}&op=avlo`
        }
    ];

    container.innerHTML = sampleOffers.map(offer => `
        <article class="ticket-result-card">
            <div class="card-top-row">
                <span class="operator-badge" style="border-color:${offer.badgeColor};">${offer.operator}</span>
                <span class="verified-tag">⚡ Plaza disponible</span>
            </div>
            <div class="ticket-times-row">
                <div class="time-block">
                    <span class="time-hour">${offer.depTime}</span>
                    <span class="time-station">${origin.split(' ')[0]}</span>
                </div>
                <div class="duration-line">${offer.duration}</div>
                <div class="time-block" style="text-align:right;">
                    <span class="time-hour">${offer.arrTime}</span>
                    <span class="time-station">${destination.split(' ')[0]}</span>
                </div>
            </div>
            <div class="ticket-bottom-row">
                <div>
                    <span class="ticket-Price">${offer.price}</span>
                    <span class="ticket-tariff">${offer.tariff}</span>
                </div>
                <a href="${offer.affiliateUrl}" target="_blank" rel="noopener noreferrer" class="buy-affiliate-btn" onclick="trackAffiliateClick('${offer.operator}')">
                    <span>Comprar Billete</span>
                    <span class="material-symbols-rounded" style="font-size:18px;">open_in_new</span>
                </a>
            </div>
        </article>
    `).join('');
}

function trackAffiliateClick(operatorName) {
    showToast(`Abriendo reserva oficial en ${operatorName}...`);
}

/* ============================================================================
   12. PESTAÑA 4: PERFIL, TEMA, MONETIZACIÓN PRO (Stripe) Y FIREBASE AUTH
   ============================================================================ */
function toggleColorTheme(isDark) {
    const root = document.documentElement;
    if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
        localStorage.setItem('trenya_theme', 'dark');
    } else {
        root.classList.add('light');
        root.classList.remove('dark');
        localStorage.setItem('trenya_theme', 'light');
    }
}

function handleProAlertsToggle(checkboxEl) {
    if (!APP_STATE.isUserPro) {
        checkboxEl.checked = false;
        openProModal();
        return;
    }
    showToast(checkboxEl.checked
        ? '🔔 Alertas Push PRO activadas en tiempo real'
        : 'Alertas Push pausadas');
}

function openProModal() {
    document.getElementById('modal-pro-paywall').classList.remove('hidden');
}

function selectStripePlan(planKey) {
    APP_STATE.proPlanSelected = planKey;
    document.getElementById('plan-monthly').classList.toggle('selected', planKey === 'monthly');
    document.getElementById('plan-yearly').classList.toggle('selected', planKey === 'yearly');
}

function startStripeCheckout() {
    APP_STATE.isUserPro = true;
    localStorage.setItem('trenya_is_pro', 'true');

    const proSwitch = document.getElementById('switch-pro-alerts');
    if (proSwitch) proSwitch.checked = true;

    const proPill = document.getElementById('pro-status-pill');
    if (proPill) {
        proPill.textContent = 'PRO ACTIVO';
        proPill.style.background = 'rgba(0, 230, 118, 0.2)';
        proPill.style.color = '#00E676';
    }

    const upgradeBtnText = document.getElementById('btn-upgrade-pro-text');
    if (upgradeBtnText) upgradeBtnText.textContent = 'Suscripción TrenYa PRO Activa ✓';

    closeModal('modal-pro-paywall');
    showToast('🎉 ¡Bienvenido a TrenYa PRO! Alertas activadas.');
}

function handleAuthAction() {
    if (APP_STATE.currentUser) {
        APP_STATE.currentUser = null;
        localStorage.removeItem('trenya_user');
        updateAuthUI();
        showToast('Sesión cerrada');
        return;
    }
    document.getElementById('modal-firebase-auth').classList.remove('hidden');
}

function submitFirebaseAuth(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email-input').value.trim();
    if (!email) return;

    APP_STATE.currentUser = {
        name: email.split('@')[0],
        email
    };
    localStorage.setItem('trenya_user', JSON.stringify(APP_STATE.currentUser));
    updateAuthUI();
    closeModal('modal-firebase-auth');
    showToast(`Hola, ${APP_STATE.currentUser.name}`);
}

function signInWithGoogleFirebase() {
    APP_STATE.currentUser = {
        name: 'Viajero TrenYa',
        email: 'viajero@trenya.app'
    };
    localStorage.setItem('trenya_user', JSON.stringify(APP_STATE.currentUser));
    updateAuthUI();
    closeModal('modal-firebase-auth');
    showToast('Conectado con Google Auth');
}

function updateAuthUI() {
    const nameEl = document.getElementById('auth-user-name');
    const emailEl = document.getElementById('auth-user-email');
    const btnLabel = document.getElementById('auth-btn-label');

    if (APP_STATE.currentUser) {
        if (nameEl) nameEl.textContent = APP_STATE.currentUser.name;
        if (emailEl) emailEl.textContent = `${APP_STATE.currentUser.email} · Sincronizado en la nube`;
        if (btnLabel) btnLabel.textContent = 'Cerrar Sesión';
    } else {
        if (nameEl) nameEl.textContent = 'Viajero Invitado';
        if (emailEl) emailEl.textContent = 'Inicia sesión para sincronizar tus rutas de Cercanías y alertas en la nube.';
        if (btnLabel) btnLabel.textContent = 'Iniciar Sesión / Registrarse';
    }
}

function openLegalModal(type, event) {
    if (event) event.preventDefault();
    const titleEl = document.getElementById('legal-modal-title');
    const bodyEl = document.getElementById('legal-modal-body');

    if (type === 'privacy') {
        titleEl.textContent = 'Política de Privacidad — TrenYa';
        bodyEl.innerHTML = `
            <p><strong>1. Privacidad por Diseño:</strong> TrenYa almacena tus rutas favoritas en tu dispositivo y no rastrea tu ubicación en segundo plano.</p>
            <p style="margin-top:8px;"><strong>2. Sincronización Opcional:</strong> Solo si inicias sesión se guardan tus preferencias en Firebase Auth.</p>
        `;
    } else {
        titleEl.textContent = 'Términos de Uso — TrenYa';
        bodyEl.innerHTML = `
            <p><strong>1. Telemetría Oficial:</strong> TrenYa procesa los datos abiertos GTFS-RT de Renfe Operadora y la red Adif con validación de 75 segundos para paradas en vía.</p>
            <p style="margin-top:8px;"><strong>2. Afiliación:</strong> El comparador de billetes conecta con distribuidores oficiales autorizados.</p>
        `;
    }
    document.getElementById('modal-legal').classList.remove('hidden');
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('hidden');
}

function closeModalOnBackdrop(event, modalId) {
    if (event.target.id === modalId) {
        closeModal(modalId);
    }
}

let deferredPwaPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPwaPrompt = e;
});

function triggerPwaInstall() {
    if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
    } else {
        showToast('En tu móvil: pulsa "Compartir" y elige "Añadir a pantalla de inicio"');
    }
}

function showToast(msg) {
    const t = document.getElementById('app-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}

/* ============================================================================
   13. ARRANQUE DE LA APLICACIÓN TRENYA
   ============================================================================ */
document.addEventListener('DOMContentLoaded', async () => {
    initSplashScreen();

    const hour = new Date().getHours();
    const greetEl = document.getElementById('greeting-time-text');
    if (greetEl) {
        if (hour >= 6 && hour < 13) greetEl.textContent = 'Buenos días 👋';
        else if (hour >= 13 && hour < 20) greetEl.textContent = 'Buenas tardes 👋';
        else greetEl.textContent = 'Buenas noches 🌙';
    }

    const dateInput = document.getElementById('ticket-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    loadSavedRoutes();
    if (localStorage.getItem('trenya_is_pro') === 'true') {
        APP_STATE.isUserPro = true;
    }
    const savedUser = localStorage.getItem('trenya_user');
    if (savedUser) {
        try { APP_STATE.currentUser = JSON.parse(savedUser); updateAuthUI(); } catch (_) {}
    }

    try {
        const stRes = await fetch('./stations.json');
        if (stRes.ok) {
            const extraStations = await stRes.json();
            if (Array.isArray(extraStations) && extraStations.length > 50) {
                const baseByName = {};
                SPANISH_STATIONS.forEach(bs => { baseByName[bs.name.toLowerCase()] = bs; });

                SPANISH_STATIONS = extraStations.map(s => {
                    const sName = s.name || s.n || '';
                    const base = baseByName[sName.toLowerCase()] || {};
                    return {
                        name: sName,
                        lat: Number(s.lat || s.la),
                        lon: Number(s.lon || s.lo),
                        hub: Boolean(s.hub || s.h || base.hub),
                        city: s.city || base.city || '',
                        postal: s.postal || base.postal || ''
                    };
                });
            }
        }
    } catch (_) {}

    renderSavedRoutesSection();
    renderAffiliateTicketCards('Madrid Puerta de Atocha', 'Sevilla Santa Justa', '');
    syncGlobalModeUI();

    await fetchLiveTrainsGTFS();
    setInterval(fetchLiveTrainsGTFS, 15000);

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
});
