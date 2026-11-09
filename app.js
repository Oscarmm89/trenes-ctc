if (!window.__VIALIBRE_BOOTED__) {
window.__VIALIBRE_BOOTED__ = true;
/* ==========================================================================
   app.js - LÓGICA MODULAR COMPLETA "VÍA LIBRE" PWA (B2C MOBILE-FIRST)
   Incluye: GTFS-RT Renfe, Validación 75s, Bottom Nav, Inicio, Mapa Limpio,
   Buscador de Billetes (Afiliados) y Perfil / Suscripción PRO.
   ========================================================================== */

// --- 1. CONFIGURACIÓN DE FUENTES DE DATOS GTFS-RT RENFE ---
const RENFE_FEED_URL = 'https://gtfsrt.renfe.com/vehicle_positions_LD.json';
const DATA_SOURCES = [
  { name: 'Proxy Vercel API', url: '/api/renfe', parse: (res) => res.json() },
  { name: 'Daemon Local (3000)', url: 'http://localhost:3000/api/renfe', parse: (res) => res.json() },
  { name: 'Caché Local Renfe', url: './renfe_live.json', parse: (res) => res.json() },
  { name: 'Directo Renfe', url: RENFE_FEED_URL, parse: (res) => res.json() }
];

// --- 2. BASE DE DATOS DE ESTACIONES Y TALLERES DE ESPAÑA ---
// Incluye estaciones clave de Cercanías, Media Distancia, AVE y Bases de Mantenimiento.
// Además, carga automáticamente ./stations.json (1.050 estaciones) en segundo plano.
let ALL_SPAIN_STATIONS = [
  ["18000", "Madrid Puerta de Atocha", 40.4065, -3.6903, "Madrid", 1],
  ["17000", "Madrid Chamartín Clara Campoamor", 40.4722, -3.6822, "Madrid", 1],
  ["71801", "Barcelona Sants", 41.3790, 2.1400, "Barcelona", 1],
  ["51003", "Sevilla Santa Justa", 37.3917, -5.9753, "Sevilla", 1],
  ["51004", "Sevilla San Bernardo", 37.3768, -5.9795, "Sevilla", 1],
  ["51100", "Dos Hermanas", 37.2869, -5.9261, "Sevilla", 1],
  ["51101", "Cantaelgallo (Dos Hermanas)", 37.2745, -5.9182, "Sevilla", 0],
  ["51103", "Utrera", 37.1856, -5.7894, "Sevilla", 0],
  ["60911", "València Joaquín Sorolla", 39.4591, -0.3829, "Valencia", 1],
  ["65000", "València Nord", 39.4667, -0.3772, "Valencia", 1],
  ["04000", "Málaga María Zambrano", 36.7118, -4.4326, "Málaga", 1],
  ["54404", "Las Mellizas", 36.8733, -4.7194, "Málaga", 0],
  ["54405", "Álora", 36.8247, -4.6968, "Málaga", 0],
  ["54403", "El Chorro - Caminito del Rey", 36.9044, -4.7591, "Málaga", 0],
  ["04040", "Zaragoza Delicias", 41.6587, -0.9113, "Zaragoza", 1],
  ["02003", "Córdoba Central", 37.8887, -4.7898, "Córdoba", 1],
  ["11200", "Valladolid Campo Grande", 41.6426, -4.7341, "Valladolid", 1],
  ["35000", "Alicante Terminal", 38.3444, -0.4950, "Alicante", 1],
  ["61303", "Murcia del Carmen", 37.9746, -1.1299, "Murcia", 1],
  ["05000", "Granada", 37.1840, -3.6092, "Granada", 1],
  ["15100", "León", 42.5954, -5.5819, "León", 1],
  ["16000", "Burgos Rosa Manzano", 42.3686, -3.6692, "Burgos", 1],
  ["21000", "Ourense", 42.3486, -7.8697, "Ourense", 1],
  ["31412", "Santiago de Compostela", 42.8704, -8.5446, "A Coruña", 1],
  ["23000", "A Coruña", 43.3526, -8.4096, "A Coruña", 1],
  ["22100", "Vigo Urzáiz", 42.2351, -8.7118, "Pontevedra", 1],
  ["15211", "Oviedo", 43.3668, -5.8543, "Asturias", 1],
  ["15400", "Gijón Sanz Crespo", 43.5392, -5.6744, "Asturias", 1],
  ["13200", "Bilbao Abando", 43.2614, -2.9278, "Bizkaia", 1],
  ["11511", "San Sebastián / Donostia", 43.3176, -1.9767, "Gipuzkoa", 1],
  ["80100", "Pamplona / Iruña", 42.8249, -1.6614, "Navarra", 1],
  ["81100", "Logroño", 42.4575, -2.4422, "La Rioja", 1],
  ["14223", "Segovia Guiomar", 40.9108, -4.0942, "Segovia", 1],
  ["03208", "Cuenca Fernando Zóbel", 40.0381, -2.1497, "Cuenca", 1],
  ["60600", "Albacete Los Llanos", 38.9999, -1.8482, "Albacete", 1],
  ["37000", "Ciudad Real Central", 38.9897, -3.9189, "Ciudad Real", 1],
  ["37100", "Puertollano", 38.6908, -4.1083, "Ciudad Real", 1],
  ["04104", "Camp de Tarragona", 41.1921, 1.2727, "Tarragona", 1],
  ["31400", "Lleida Pirineus", 41.6207, 0.6327, "Lleida", 1],
  ["79300", "Girona", 41.9792, 2.8172, "Girona", 1],
  ["79500", "Figueres-Vilafant", 42.2661, 2.9469, "Girona", 1],
  ["92102", "Toledo", 39.8623, -4.0112, "Toledo", 1],
  ["51405", "Jerez de la Frontera", 36.6797, -6.1268, "Cádiz", 1],
  ["51400", "Cádiz", 36.5288, -6.2877, "Cádiz", 1],
  ["10200", "Aranjuez", 40.0338, -3.6177, "Madrid", 0],
  ["70103", "Alcalá de Henares", 40.4890, -3.3658, "Madrid", 0],
  ["17107", "Villalba de Guadarrama", 40.6258, -4.0067, "Madrid", 0],
  ["17113", "Cercedilla", 40.7376, -4.0667, "Madrid", 0],
  ["71701", "El Prat de Llobregat", 41.3275, 2.0945, "Barcelona", 0],
  ["71705", "L'Hospitalet de Llobregat", 41.3592, 2.0998, "Barcelona", 0],
  // Bases de Mantenimiento y Talleres Oficiales (Evitan falsos positivos de parada en vía)
  ["DEPOT-BCN-1", "Can Tunis (Talleres Alta Velocidad)", 41.3528, 2.1465, "Barcelona", 1],
  ["DEPOT-BCN-2", "La Sagrera (Talleres AVE)", 41.4242, 2.1935, "Barcelona", 1],
  ["DEPOT-MAD-1", "Cerro Negro (Talleres AVE)", 40.3885, -3.6715, "Madrid", 1],
  ["DEPOT-MAD-2", "Santa Catalina (Talleres Adif)", 40.3750, -3.6650, "Madrid", 1],
  ["DEPOT-MAD-3", "Fuencarral (Talleres Chamartín)", 40.4905, -3.6825, "Madrid", 1],
  ["DEPOT-MAD-4", "La Sagra (Base Mantenimiento AVE)", 39.9960, -3.8560, "Toledo", 1],
  ["DEPOT-SEV-1", "San Jerónimo / La Negrilla (Talleres)", 37.3820, -5.9350, "Sevilla", 1],
  ["DEPOT-MAL-1", "Los Prados (Talleres Málaga)", 36.7020, -4.4720, "Málaga", 1],
  ["DEPOT-VAL-1", "Fuente de San Luis (Talleres)", 39.4450, -0.3650, "Valencia", 1]
];

// --- 3. ESTADO GLOBAL DE LA APLICACIÓN ---
let currentTab = 'home';              // 'home' | 'map' | 'tickets' | 'profile'
let homeQuickFilter = 'ALL';          // 'ALL' | 'LD' (AVE/Larga Dist) | 'MD' (Cercanías/Media Dist) | 'ALERT'
let homeSearchQuery = '';
let mapFilterMode = 'ZONE';           // 'ZONE' (Solo zona usuario) | 'LD' | 'MD' | 'ALL'

let trainsData = [];
let previousPositions = new Map();    // trainId -> { lat, lng, time }
let stoppedCycleCounters = new Map(); // trainId -> ciclos consecutivos detenido (5 ciclos = 75s)
let favoriteTrains = new Map();       // trainId -> { id, name }
let savedCommuteRoutes = [];          // Array de rutas diarias de Cercanías/MD

let userCoords = { lat: 37.3917, lng: -5.9753, label: 'Sevilla Santa Justa' }; // Ubicación por defecto o GPS
let hasCustomGps = false;

let map = null;
let markersMap = new Map();
let stationMarkersMap = new Map();
let openRailwayMapLayer = null;
let showTracksLayer = true;
let showStationsLayer = true;
let selectedTrainId = null;

let activeSourceIndex = 0;
let isFetching = false;
let isDarkMode = true;
let isSoundEnabled = false;
let isUserPro = false;                // Estado de suscripción Vía Libre PRO
let currentUser = null;               // Usuario autenticado (Firebase Auth)
let deferredInstallPrompt = null;     // Evento de instalación PWA

// --- 4. INICIALIZACIÓN PRINCIPAL ---
window.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  loadPersistedState();
  updateGreeting();
  initTheme();
  initTicketDefaults();
  renderSavedRoutes();
  loadFullStationsDatabase();
  fetchRenfeData();

  // Refresco automático GTFS-RT cada 15 segundos (5 ciclos = 75s para validación de parada)
  setInterval(() => {
    fetchRenfeData();
  }, 15000);
});

// Registro de Service Worker para PWA Instalable
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) installBtn.classList.remove('hidden');
  });
}

// Carga asíncrona del catálogo completo de 1.050 estaciones si está disponible
async function loadFullStationsDatabase() {
  try {
    const res = await fetch('./stations.json');
    if (!res.ok) return;
    const jsonList = await res.json();
    if (Array.isArray(jsonList) && jsonList.length > 100) {
      const existingCodes = new Set(ALL_SPAIN_STATIONS.map((s) => s[0]));
      jsonList.forEach((st) => {
        if (!existingCodes.has(st.code) && st.lat >= 35.8 && st.lat <= 43.9 && st.lng >= -9.5 && st.lng <= 4.5) {
          ALL_SPAIN_STATIONS.push([st.code, st.name, Number(st.lat), Number(st.lng), st.prov || '', 0]);
        }
      });
    }
  } catch (e) {}
}

// --- 5. NAVEGACIÓN INFERIOR (BOTTOM NAVIGATION BAR) ---
function switchTab(tabId) {
  currentTab = tabId;

  // Actualizar botones del Bottom Nav
  document.querySelectorAll('.bottom-nav-item').forEach((btn) => {
    const isTarget = btn.getAttribute('data-tab') === tabId;
    btn.classList.toggle('active', isTarget);
  });

  // Mostrar la vista activa con transición suave (0.3s ease)
  document.querySelectorAll('.tab-view').forEach((view) => {
    const isTarget = view.id === `view-${tabId}`;
    view.classList.toggle('active', isTarget);
  });

  // Si entra en la pestaña Mapa en Vivo, inicializar o reajustar Leaflet
  if (tabId === 'map') {
    if (!map) {
      initMap();
    } else {
      setTimeout(() => {
        map.invalidateSize();
        renderMapMarkers();
      }, 150);
    }
  }
}

// --- 6. MOTOR DE DATOS GTFS-RT Y VALIDACIÓN DE 75 SEGUNDOS ---
async function fetchRenfeData() {
  if (isFetching) return;
  isFetching = true;

  const syncDot = document.getElementById('header-live-dot');
  if (syncDot) syncDot.style.opacity = '0.5';

  let rawData = null;

  for (let i = 0; i < DATA_SOURCES.length; i++) {
    const idx = (activeSourceIndex + i) % DATA_SOURCES.length;
    const source = DATA_SOURCES[idx];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(source.url, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = await source.parse(res);
      if (parsed && Array.isArray(parsed.entity)) {
        rawData = parsed;
        activeSourceIndex = idx;
        break;
      }
    } catch (e) {}
  }

  isFetching = false;
  if (syncDot) syncDot.style.opacity = '1';

  if (rawData && Array.isArray(rawData.entity)) {
    processTrainsFeed(rawData.entity);
  }
}

function processTrainsFeed(entityList) {
  const seenIds = new Set();
  const processed = [];
  const now = Date.now();

  for (const ent of entityList) {
    const veh = ent.vehicle;
    if (!veh || !veh.position || veh.position.latitude == null || veh.position.longitude == null) continue;

    const trainId = String(veh.vehicle?.id || veh.trip?.tripId || ent.id).trim();
    if (!trainId || seenIds.has(trainId)) continue;
    seenIds.add(trainId);

    const lat = Number(veh.position.latitude);
    const lng = Number(veh.position.longitude);
    if (lat < 35.5 || lat > 44.0 || lng < -9.6 || lng > 4.5) continue;

    const classification = classifyTrain(trainId);
    const nearestStation = getNearestStation(lat, lng);
    const distToStation = nearestStation ? nearestStation.distKm : 999;

    // Cálculo de velocidad mediante diferencial Haversine
    let speedKmH = 0;
    const prevPos = previousPositions.get(trainId);
    if (prevPos) {
      const dtHours = (now - prevPos.time) / 3600000;
      if (dtHours > 0.0008) {
        const distTraveled = haversineKm(prevPos.lat, prevPos.lng, lat, lng);
        const rawSpeed = Math.round(distTraveled / dtHours);
        speedKmH = rawSpeed > 340 ? 295 : rawSpeed;
      }
    } else {
      speedKmH = veh.currentStatus === 'IN_TRANSIT_TO' ? (classification.group === 'LD' ? 245 : 115) : 0;
    }
    previousPositions.set(trainId, { lat, lng, time: now });

    // --- VALIDACIÓN DE 75 SEGUNDOS (5 CICLOS DE 15s) PARA PARADAS ---
    const isNearStationOrDepot = (veh.currentStatus === 'STOPPED_AT' || distToStation <= 2.2);
    const isSpeedZero = (speedKmH < 10);

    let consecutiveStopped = stoppedCycleCounters.get(trainId) || 0;
    if (isSpeedZero || veh.currentStatus === 'STOPPED_AT') {
      consecutiveStopped += 1;
    } else {
      consecutiveStopped = 0;
    }
    stoppedCycleCounters.set(trainId, consecutiveStopped);

    // Solo se confirma parada real tras 5 actualizaciones seguidas (75 segundos)
    const isConfirmedStopped = consecutiveStopped >= 5;
    const isStoppedInStation = isConfirmedStopped && isNearStationOrDepot;
    const isStoppedOnTrack = isConfirmedStopped && !isNearStationOrDepot && distToStation > 3.5;

    const delayMinutes = veh.delay ? Math.max(0, Math.round(veh.delay / 60)) : (isStoppedOnTrack ? 14 : 0);
    const routeData = inferTrainRoute(trainId, lat, lng, prevPos?.lat, prevPos?.lng);

    processed.push({
      id: trainId,
      displayName: classification.displayName,
      type: classification.type,
      group: classification.group, // 'LD' (AVE/Larga Dist) | 'MD' (Cercanías/Media Dist)
      series: classification.series,
      lat,
      lng,
      speed: isConfirmedStopped ? 0 : speedKmH,
      isConfirmedStopped,
      isStoppedInStation,
      isStoppedOnTrack,
      isNearStationOrDepot,
      nearestStation,
      distToStation,
      delayMinutes,
      route: routeData,
      updatedAt: now
    });
  }

  trainsData = processed;

  // Actualizar contadores y vistas
  const badgeCount = document.getElementById('live-trains-count');
  if (badgeCount) badgeCount.textContent = `${trainsData.length} trenes en vivo`;

  renderHomeNearbyTrains();
  renderSavedRoutes();
  renderFavoriteTrainsSection();

  if (map && currentTab === 'map') {
    renderMapMarkers();
  }

  if (selectedTrainId) {
    const activeTrain = trainsData.find((t) => t.id === selectedTrainId);
    if (activeTrain) populateTrainBottomSheet(activeTrain);
  }
}

// Clasificación B2C: separa claramente AVE/Larga Distancia ('LD') de Cercanías/Media Distancia ('MD')
function classifyTrain(rawId) {
  const cleanNum = String(rawId).replace(/\D/g, '').slice(0, 5) || '00000';
  const prefix2 = cleanNum.slice(0, 2);
  const prefix3 = cleanNum.slice(0, 3);

  if (['030', '031', '032', '033', '020', '021', '022'].includes(prefix3)) {
    return { displayName: `AVE ${cleanNum}`, type: 'AVE', group: 'LD', series: 'S-102 / S-103 Alta Velocidad' };
  }
  if (['06', '14', '15'].includes(prefix2)) {
    return { displayName: `Avlo ${cleanNum}`, type: 'Avlo', group: 'LD', series: 'S-112 / S-106 Low Cost' };
  }
  if (['04', '05', '10', '11'].includes(prefix2)) {
    return { displayName: `Alvia ${cleanNum}`, type: 'Alvia', group: 'LD', series: 'S-130 / S-730 Híbrido' };
  }
  if (['01'].includes(prefix2)) {
    return { displayName: `Euromed ${cleanNum}`, type: 'Euromed', group: 'LD', series: 'S-130 Corredor Mediterráneo' };
  }
  if (['08', '09'].includes(prefix2)) {
    return { displayName: `Avant ${cleanNum}`, type: 'Avant', group: 'MD', series: 'S-104 / S-114 Lanzadera' };
  }
  if (['17', '18', '19', '30', '31', '33'].includes(prefix2)) {
    return { displayName: `MD / Cercanías ${cleanNum}`, type: 'Cercanías/MD', group: 'MD', series: 'S-449 / Civia Cercanías' };
  }
  return { displayName: `AVE ${cleanNum}`, type: 'AVE', group: 'LD', series: 'S-103 Renfe' };
}

function inferTrainRoute(trainId, lat, lng, prevLat, prevLng) {
  const idStr = String(trainId || '').trim();
  const headingEast = prevLng != null ? lng >= prevLng : lng > -2.0;
  const headingSouth = prevLat != null ? lat <= prevLat : lat < 39.2;

  if (idStr.startsWith('030') || idStr.startsWith('031') || idStr.startsWith('15') || (lat > 40.7 && lng > -1.8)) {
    return {
      origin: headingEast ? 'Madrid P. Atocha' : 'Barcelona Sants',
      destination: headingEast ? 'Barcelona Sants' : 'Madrid P. Atocha',
      stops: headingEast
        ? ['Madrid P. Atocha', 'Zaragoza Delicias', 'Lleida Pirineus', 'Camp de Tarragona', 'Barcelona Sants']
        : ['Barcelona Sants', 'Camp de Tarragona', 'Zaragoza Delicias', 'Guadalajara Yebes', 'Madrid P. Atocha']
    };
  }
  if (idStr.startsWith('02') || (lat < 39.2 && lng < -2.2)) {
    const dest = lng < -4.8 ? 'Sevilla Santa Justa' : 'Málaga María Zambrano';
    return {
      origin: headingSouth ? 'Madrid P. Atocha' : dest,
      destination: headingSouth ? dest : 'Madrid P. Atocha',
      stops: headingSouth
        ? ['Madrid P. Atocha', 'Ciudad Real', 'Puertollano', 'Córdoba Central', dest]
        : [dest, 'Córdoba Central', 'Puertollano', 'Ciudad Real', 'Madrid P. Atocha']
    };
  }
  if (lat >= 38.0 && lat <= 40.5 && lng >= -2.5 && lng <= 0.6) {
    return {
      origin: headingEast ? 'Madrid Chamartín' : 'València Joaquín Sorolla',
      destination: headingEast ? 'València Joaquín Sorolla' : 'Madrid Chamartín',
      stops: ['Madrid Chamartín', 'Cuenca Fernando Zóbel', 'Requena-Utiel', 'València Joaquín Sorolla']
    };
  }
  return {
    origin: headingSouth ? 'León / Valladolid' : 'Madrid Chamartín',
    destination: headingSouth ? 'Madrid Chamartín' : 'León / Gijón',
    stops: ['Madrid Chamartín', 'Segovia Guiomar', 'Valladolid Campo Grande', 'Palencia', 'León']
  };
}

// --- 7. GEOMETRÍA Y BÚSQUEDA ESPACIAL DE ESTACIONES ---
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getNearestStation(lat, lng) {
  let nearest = null;
  let minDist = Infinity;

  for (let i = 0; i < ALL_SPAIN_STATIONS.length; i++) {
    const s = ALL_SPAIN_STATIONS[i];
    const d = haversineKm(lat, lng, s[2], s[3]);
    if (d < minDist) {
      minDist = d;
      nearest = { code: s[0], name: s[1], lat: s[2], lng: s[3], prov: s[4], isMajor: s[5] === 1, distKm: d };
    }
  }
  return nearest;
}

// --- 8. PESTAÑA 1: INICIO (EXPLORAR, BUSCADOR, MIS RUTAS Y ESTACIONES CERCANAS) ---
function updateGreeting() {
  const hour = new Date().getHours();
  let greeting = '¡Buenos días, viajero!';
  if (hour >= 13 && hour < 20) greeting = '¡Buenas tardes, viajero!';
  else if (hour >= 20 || hour < 6) greeting = '¡Buenas noches, viajero!';

  const el = document.getElementById('home-greeting-text');
  if (el) el.textContent = greeting;
}

function setHomeQuickFilter(filterType) {
  homeQuickFilter = filterType;

  document.querySelectorAll('.home-filter-pill').forEach((btn) => {
    const isTarget = btn.getAttribute('data-filter') === filterType;
    btn.classList.toggle('active', isTarget);
  });

  // Sincronizar también con el filtro del Mapa en Vivo
  if (filterType === 'LD') mapFilterMode = 'LD';
  else if (filterType === 'MD') mapFilterMode = 'MD';
  else if (filterType === 'ALL') mapFilterMode = 'ZONE';

  updateMapFilterUI();
  renderHomeNearbyTrains();
}

function handleHomeSearch(query) {
  homeSearchQuery = (query || '').trim().toLowerCase();
  const clearBtn = document.getElementById('btn-clear-home-search');
  if (clearBtn) clearBtn.classList.toggle('hidden', !homeSearchQuery);

  renderHomeNearbyTrains();
}

function clearHomeSearch() {
  const input = document.getElementById('home-search-input');
  if (input) input.value = '';
  handleHomeSearch('');
}

// Detectar ubicación real del usuario para "Estaciones Cercanas"
function detectUserLocation() {
  if (!navigator.geolocation) {
    showToast('⚠️ Tu navegador no soporta geolocalización.');
    return;
  }

  const btnText = document.getElementById('gps-status-label');
  if (btnText) btnText.textContent = 'Localizando GPS...';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      hasCustomGps = true;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const nearest = getNearestStation(lat, lng);
      userCoords = {
        lat,
        lng,
        label: nearest ? nearest.name : 'Tu ubicación actual'
      };
      showToast(`📍 Estación más cercana: ${userCoords.label}`);
      renderHomeNearbyTrains();
      if (map) {
        map.flyTo([lat, lng], 10, { duration: 0.9 });
      }
    },
    () => {
      showToast('📍 Usando ubicación de referencia: Madrid / Sevilla.');
      if (btnText) btnText.textContent = userCoords.label;
    },
    { enableHighAccuracy: true, timeout: 6000 }
  );
}

// Cambiar rápidamente la ciudad de referencia si el usuario no usa GPS
function setReferenceCity(lat, lng, label) {
  userCoords = { lat, lng, label };
  renderHomeNearbyTrains();
  showToast(`📍 Estación cercana fijada en ${label}`);
}

function renderHomeNearbyTrains() {
  const container = document.getElementById('home-nearby-trains-list');
  const stationTitle = document.getElementById('nearest-station-name');
  const sectionLabel = document.getElementById('nearby-section-subtitle');
  if (!container) return;

  const nearestSt = getNearestStation(userCoords.lat, userCoords.lng);
  if (stationTitle && nearestSt) {
    stationTitle.textContent = nearestSt.name;
  }

  let list = [...trainsData];

  // Aplicar filtro de Chips de Inicio
  if (homeQuickFilter === 'LD') {
    list = list.filter((t) => t.group === 'LD');
  } else if (homeQuickFilter === 'MD') {
    list = list.filter((t) => t.group === 'MD');
  } else if (homeQuickFilter === 'ALERT') {
    list = list.filter((t) => t.isStoppedOnTrack || t.delayMinutes > 5);
  }

  // Aplicar búsqueda por texto si el usuario ha escrito en el buscador
  if (homeSearchQuery) {
    list = list.filter((t) => {
      const matchName = t.displayName.toLowerCase().includes(homeSearchQuery);
      const matchOrig = t.route.origin.toLowerCase().includes(homeSearchQuery);
      const matchDest = t.route.destination.toLowerCase().includes(homeSearchQuery);
      const matchSt = t.nearestStation && t.nearestStation.name.toLowerCase().includes(homeSearchQuery);
      const matchProv = t.nearestStation && t.nearestStation.prov.toLowerCase().includes(homeSearchQuery);
      return matchName || matchOrig || matchDest || matchSt || matchProv;
    });
    if (sectionLabel) sectionLabel.textContent = `Resultados para "${homeSearchQuery}" (${list.length})`;
  } else {
    // Ordenar por cercanía a la estación del usuario
    list.forEach((t) => {
      t._distToUser = haversineKm(userCoords.lat, userCoords.lng, t.lat, t.lng);
    });
    list.sort((a, b) => a._distToUser - b._distToUser);
    if (sectionLabel) sectionLabel.textContent = `Próximos trenes en torno a ${nearestSt ? nearestSt.name : userCoords.label}`;
  }

  const displaySlice = list.slice(0, 8);

  if (displaySlice.length === 0) {
    container.innerHTML = `
      <div class="b2c-card text-center py-6">
        <span class="material-symbols-outlined text-3xl text-zinc-500 mb-1">train</span>
        <p class="text-sm font-medium text-zinc-300">No hay trenes que coincidan con este filtro ahora mismo</p>
        <button onclick="setHomeQuickFilter('ALL'); clearHomeSearch();" class="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400">
          Ver todos los trenes activos
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = displaySlice
    .map((train) => {
      const isFav = favoriteTrains.has(train.id);
      let statusBadge = '';
      let dotClass = 'live-dot-green';

      if (train.isStoppedOnTrack) {
        statusBadge = `<span class="status-badge-red px-2.5 py-0.5 rounded-full text-[11px] font-bold">⚠️ Parada en Vía</span>`;
        dotClass = 'live-dot-red';
      } else if (train.isStoppedInStation || train.isNearStationOrDepot) {
        statusBadge = `<span class="status-badge-amber px-2.5 py-0.5 rounded-full text-[11px] font-bold">En estación · En hora</span>`;
        dotClass = 'live-dot-amber';
      } else {
        statusBadge = `<span class="status-badge-green px-2.5 py-0.5 rounded-full text-[11px] font-bold">${train.speed} km/h · En hora</span>`;
      }

      const nearName = train.nearestStation ? train.nearestStation.name : 'En trayecto';

      return `
        <div class="b2c-card b2c-card-interactive cursor-pointer flex flex-col gap-2.5" onclick="openTrainSheet('${train.id}', false)">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="${dotClass}"></span>
              <span class="font-bold text-base tracking-tight">${train.displayName}</span>
              ${isFav ? '<span>❤️</span>' : ''}
            </div>
            ${statusBadge}
          </div>

          <div class="flex items-center justify-between text-sm text-zinc-300">
            <div class="flex items-center gap-1.5 font-medium truncate max-w-[70%]">
              <span>${train.route.origin}</span>
              <span class="text-emerald-400">➔</span>
              <span>${train.route.destination}</span>
            </div>
            <span class="text-xs text-zinc-400 font-mono">📍 ${nearName}</span>
          </div>
        </div>
      `;
    })
    .join('');
}

// --- 9. GESTIÓN DE "MIS RUTAS (CERCANÍAS / DIARIAS)" ---
function renderSavedRoutes() {
  const container = document.getElementById('saved-routes-container');
  if (!container) return;

  if (savedCommuteRoutes.length === 0) {
    container.innerHTML = `
      <div class="b2c-card border-dashed border-2 border-zinc-700/70 flex flex-col items-center justify-center py-6 text-center gap-2">
        <span class="material-symbols-outlined text-3xl text-emerald-400">commute</span>
        <div>
          <p class="font-bold text-sm">Guarda tu trayecto habitual de Cercanías o AVE</p>
          <p class="text-xs text-zinc-400 mt-0.5">Consulta horarios, vía y retrasos con un solo toque al abrir la app.</p>
        </div>
        <button onclick="openAddRouteModal()" class="mt-2 px-4 py-2.5 rounded-xl bg-[#00E676] text-[#002912] font-bold text-sm flex items-center gap-1.5 shadow-lg">
          <span class="material-symbols-outlined text-[18px]">add_circle</span>
          Añadir mi ruta diaria
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = savedCommuteRoutes
    .map((route, idx) => {
      return `
        <div class="b2c-card flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 font-bold text-xs">${route.line || 'Cercanías C1'}</span>
              <span class="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span class="live-dot-green" style="width:7px;height:7px;"></span> Servicio normal
              </span>
            </div>
            <button onclick="removeSavedRoute(${idx})" class="text-zinc-500 hover:text-red-400 p-1" title="Eliminar ruta">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-xs text-zinc-400">Origen</span>
              <span class="font-bold text-base">${route.origin}</span>
            </div>
            <span class="material-symbols-outlined text-emerald-400">arrow_forward</span>
            <div class="flex flex-col text-right">
              <span class="text-xs text-zinc-400">Destino</span>
              <span class="font-bold text-base">${route.destination}</span>
            </div>
          </div>

          <div class="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
            <span class="text-zinc-300">⏱️ Próximos trenes: <strong class="text-emerald-400">en 6 min</strong> y <strong class="text-zinc-200">21 min</strong></span>
            <button onclick="focusRouteOnMap('${route.origin}')" class="text-emerald-400 font-bold flex items-center gap-0.5 hover:underline">
              Ver mapa <span class="material-symbols-outlined text-[15px]">chevron_right</span>
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

function openAddRouteModal() {
  const modal = document.getElementById('modal-add-route');
  if (modal) modal.classList.remove('hidden');
}

function closeAddRouteModal() {
  const modal = document.getElementById('modal-add-route');
  if (modal) modal.classList.add('hidden');
}

function saveNewCommuteRoute(e) {
  if (e) e.preventDefault();
  const orig = document.getElementById('route-origin-select').value;
  const dest = document.getElementById('route-dest-select').value;
  const line = document.getElementById('route-line-select').value;

  if (orig === dest) {
    showToast('⚠️ El origen y el destino deben ser distintos.');
    return;
  }

  savedCommuteRoutes.push({ origin: orig, destination: dest, line });
  try {
    localStorage.setItem('vialibre_saved_routes', JSON.stringify(savedCommuteRoutes));
  } catch (err) {}

  closeAddRouteModal();
  renderSavedRoutes();
  showToast(`✅ Ruta guardada: ${orig} ➔ ${dest}`);
}

function removeSavedRoute(index) {
  savedCommuteRoutes.splice(index, 1);
  try {
    localStorage.setItem('vialibre_saved_routes', JSON.stringify(savedCommuteRoutes));
  } catch (err) {}
  renderSavedRoutes();
  showToast('🗑️ Ruta eliminada de tus favoritos');
}

function focusRouteOnMap(stationName) {
  const st = ALL_SPAIN_STATIONS.find((s) => s[1].toLowerCase().includes(stationName.toLowerCase()));
  if (st) {
    userCoords = { lat: st[2], lng: st[3], label: st[1] };
  }
  switchTab('map');
  setTimeout(() => {
    if (map && st) {
      map.flyTo([st[2], st[3]], 11, { duration: 0.9 });
    }
  }, 200);
}

// --- 10. PESTAÑA 2: MAPA EN VIVO (LIMPIO, FILTRADO POR ZONA Y CAPAS) ---
function initMap() {
  const spainMaxBounds = L.latLngBounds([[35.0, -10.2], [44.2, 4.6]]);

  map = L.map('leaflet-map', {
    zoomControl: false,
    attributionControl: true,
    minZoom: 6,
    maxZoom: 18,
    maxBounds: spainMaxBounds,
    maxBoundsViscosity: 0.95
  }).setView([userCoords.lat, userCoords.lng], 8);

  L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
    attribution: '&copy; OpenStreetMap | Renfe / Adif'
  }).addTo(map);

  // Capa de Infraestructura Ferroviaria Adif (Vías de Alta Velocidad y Convencionales) acotada a España
  const spainRailwayBounds = L.latLngBounds([[35.8, -9.6], [43.85, 4.4]]);
  openRailwayMapLayer = L.tileLayer('https://{s}.tiles.openrailwaymap.org/maxspeed/{z}/{x}/{y}.png', {
    bounds: spainRailwayBounds,
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
    opacity: 0.85,
    attribution: 'Vías: OpenRailwayMap'
  });

  if (showTracksLayer) {
    openRailwayMapLayer.addTo(map);
  }

  updateVisibleStationMarkers();
  renderMapMarkers();

  map.on('moveend zoomend', () => {
    updateVisibleStationMarkers();
    if (mapFilterMode === 'ZONE') {
      renderMapMarkers();
    }
  });
}

function setMapFilterMode(mode) {
  mapFilterMode = mode;
  updateMapFilterUI();

  if (map) {
    if (mode === 'ALL') {
      map.flyTo([40.2, -3.7], 6, { duration: 0.8 });
    } else if (mode === 'ZONE') {
      map.flyTo([userCoords.lat, userCoords.lng], 8, { duration: 0.8 });
    }
    renderMapMarkers();
  }
}

function updateMapFilterUI() {
  document.querySelectorAll('.map-mode-chip').forEach((btn) => {
    const isTarget = btn.getAttribute('data-map-mode') === mapFilterMode;
    btn.classList.toggle('bg-[#00E676]', isTarget);
    btn.classList.toggle('text-[#002912]', isTarget);
    btn.classList.toggle('bg-[#1E1E1E]/90', !isTarget);
    btn.classList.toggle('text-zinc-200', !isTarget);
  });
}

function getTrainsForMap() {
  if (!map) return [];

  let filtered = [...trainsData];

  if (mapFilterMode === 'LD') {
    filtered = filtered.filter((t) => t.group === 'LD');
  } else if (mapFilterMode === 'MD') {
    filtered = filtered.filter((t) => t.group === 'MD');
  } else if (mapFilterMode === 'ZONE') {
    // Modo Limpio por defecto: solo muestra los trenes dentro de la vista actual o a <= 160km de la zona del usuario
    const center = map.getCenter();
    filtered = filtered.filter((t) => {
      const distToCenter = haversineKm(center.lat, center.lng, t.lat, t.lng);
      const distToUser = haversineKm(userCoords.lat, userCoords.lng, t.lat, t.lng);
      return distToCenter <= 180 || distToUser <= 160 || favoriteTrains.has(t.id) || t.id === selectedTrainId;
    });
  }

  return filtered;
}

function renderMapMarkers() {
  if (!map) return;

  const visibleTrains = getTrainsForMap();
  const activeIds = new Set(visibleTrains.map((t) => t.id));

  for (const [id, marker] of markersMap.entries()) {
    if (!activeIds.has(id)) {
      map.removeLayer(marker);
      markersMap.delete(id);
    }
  }

  for (const train of visibleTrains) {
    const isSelected = train.id === selectedTrainId;
    const icon = buildTrainMarkerIcon(train, isSelected);

    if (markersMap.has(train.id)) {
      const m = markersMap.get(train.id);
      m.setLatLng([train.lat, train.lng]);
      m.setIcon(icon);
    } else {
      const m = L.marker([train.lat, train.lng], {
        icon,
        title: `${train.displayName} (${train.route.origin} ➔ ${train.route.destination})`
      });
      m.on('click', () => {
        openTrainSheet(train.id, true);
      });
      m.addTo(map);
      markersMap.set(train.id, m);
    }
  }

  const counterEl = document.getElementById('map-visible-counter');
  if (counterEl) {
    counterEl.textContent = `${visibleTrains.length} trenes en vista`;
  }
}

function buildTrainMarkerIcon(train, isSelected) {
  let statusClass = '';
  let dotClass = 'live-dot-green';

  if (train.isStoppedOnTrack) {
    statusClass = 'status-red';
    dotClass = 'live-dot-red';
  } else if (train.isStoppedInStation || train.isNearStationOrDepot) {
    statusClass = 'status-amber';
    dotClass = 'live-dot-amber';
  }

  const speedText = train.speed > 0 ? `${train.speed} km/h` : 'Andén';
  const favBadge = favoriteTrains.has(train.id) ? ' ❤️' : '';

  const html = `
    <div class="train-marker-pill ${statusClass} ${isSelected ? 'selected' : ''}">
      <span class="${dotClass}"></span>
      <span>${train.displayName}</span>
      <span class="opacity-75 text-[10px]">${speedText}${favBadge}</span>
    </div>
  `;

  return L.divIcon({
    className: 'custom-train-marker',
    html,
    iconSize: [115, 26],
    iconAnchor: [57, 13]
  });
}

// Nivel de Detalle (LOD) de estaciones para evitar saturación en el mapa
function updateVisibleStationMarkers() {
  if (!map) return;

  if (!showStationsLayer) {
    stationMarkersMap.forEach((m) => map.removeLayer(m));
    stationMarkersMap.clear();
    return;
  }

  const zoom = map.getZoom();
  const bounds = map.getBounds();
  const toRender = [];

  for (let i = 0; i < ALL_SPAIN_STATIONS.length; i++) {
    const s = ALL_SPAIN_STATIONS[i];
    const lat = s[2];
    const lng = s[3];
    const isMajor = s[5] === 1;

    if (lat < bounds.getSouth() - 0.1 || lat > bounds.getNorth() + 0.1 || lng < bounds.getWest() - 0.1 || lng > bounds.getEast() + 0.1) {
      continue;
    }

    if (zoom < 10) {
      if (isMajor && !s[0].startsWith('DEPOT')) toRender.push({ s, mode: 'full' });
    } else if (zoom === 10 || zoom === 11) {
      if (isMajor) toRender.push({ s, mode: 'full' });
      else toRender.push({ s, mode: 'dot' });
    } else {
      toRender.push({ s, mode: 'full' });
    }
  }

  const activeCodes = new Set(toRender.map((item) => item.s[0]));
  for (const [code, marker] of stationMarkersMap.entries()) {
    if (!activeCodes.has(code)) {
      map.removeLayer(marker);
      stationMarkersMap.delete(code);
    }
  }

  for (const item of toRender) {
    const s = item.s;
    const code = s[0];
    const name = s[1];
    const isMajor = s[5] === 1;
    const isDot = item.mode === 'dot';

    const existing = stationMarkersMap.get(code);
    if (existing && existing._mode === item.mode) continue;
    if (existing) {
      map.removeLayer(existing);
      stationMarkersMap.delete(code);
    }

    const html = isDot
      ? `<div class="station-marker-badge dot-only" title="${name}">🏠</div>`
      : `<div class="station-marker-badge ${isMajor ? 'major' : ''}"><span>${isMajor ? '🏛️' : '🏠'}</span><span class="truncate max-w-[85px]">${name}</span></div>`;

    const marker = L.marker([s[2], s[3]], {
      icon: L.divIcon({
        className: 'custom-station-icon',
        html,
        iconSize: isDot ? [12, 12] : [96, 20],
        iconAnchor: isDot ? [6, 6] : [48, 10]
      }),
      zIndexOffset: -500
    });
    marker._mode = item.mode;
    marker.addTo(map);
    stationMarkersMap.set(code, marker);
  }
}

function toggleLayersPopover() {
  const pop = document.getElementById('map-layers-popover');
  if (pop) pop.classList.toggle('hidden');
}

function toggleMapTracksLayer(checked) {
  showTracksLayer = checked;
  if (!map || !openRailwayMapLayer) return;
  if (showTracksLayer) map.addLayer(openRailwayMapLayer);
  else map.removeLayer(openRailwayMapLayer);
}

function toggleMapStationsLayer(checked) {
  showStationsLayer = checked;
  updateVisibleStationMarkers();
}

function toggleDesktopExpandMap() {
  const shell = document.getElementById('app-shell');
  if (shell) {
    shell.classList.toggle('map-expanded');
    if (map) setTimeout(() => map.invalidateSize(), 310);
  }
}

// --- 11. FICHA DEL TREN EN VIVO (BOTTOM SHEET) Y SEGUIMIENTO ❤️ ---
function openTrainSheet(trainId, alreadyOnMap = false) {
  selectedTrainId = trainId;
  const train = trainsData.find((t) => t.id === trainId);
  if (!train) return;

  populateTrainBottomSheet(train);

  const sheet = document.getElementById('train-bottom-sheet');
  if (sheet) sheet.classList.add('open');

  if (alreadyOnMap && map) {
    map.flyTo([train.lat, train.lng], Math.max(map.getZoom(), 11), { duration: 0.8 });
    renderMapMarkers();
  }
}

function closeTrainSheet() {
  selectedTrainId = null;
  const sheet = document.getElementById('train-bottom-sheet');
  if (sheet) sheet.classList.remove('open');
  if (map) renderMapMarkers();
}

function viewSelectedTrainOnMap() {
  const id = selectedTrainId;
  switchTab('map');
  setTimeout(() => {
    const train = trainsData.find((t) => t.id === id);
    if (train && map) {
      map.flyTo([train.lat, train.lng], 11, { duration: 0.9 });
      renderMapMarkers();
    }
  }, 220);
}

function populateTrainBottomSheet(train) {
  document.getElementById('sheet-train-name').textContent = train.displayName;
  document.getElementById('sheet-train-series').textContent = train.series;
  document.getElementById('sheet-train-origin').textContent = train.route.origin;
  document.getElementById('sheet-train-dest').textContent = train.route.destination;
  document.getElementById('sheet-train-speed').textContent = `${train.speed}`;

  const statusEl = document.getElementById('sheet-train-status-badge');
  const alertBox = document.getElementById('sheet-track-alert-box');

  if (train.isStoppedOnTrack) {
    statusEl.className = 'status-badge-red px-3 py-1 rounded-full text-xs font-bold';
    statusEl.textContent = '⚠️ Detenido en Plena Vía';
    if (alertBox) {
      alertBox.classList.remove('hidden');
      document.getElementById('sheet-track-alert-text').textContent = `Parada prolongada (>75s) a ${train.distToStation.toFixed(1)} km de ${train.nearestStation ? train.nearestStation.name : 'estación'}.`;
    }
  } else if (train.isStoppedInStation || train.isNearStationOrDepot) {
    statusEl.className = 'status-badge-amber px-3 py-1 rounded-full text-xs font-bold';
    statusEl.textContent = `📍 En ${train.nearestStation ? train.nearestStation.name : 'Estación'}`;
    if (alertBox) alertBox.classList.add('hidden');
  } else {
    statusEl.className = 'status-badge-green px-3 py-1 rounded-full text-xs font-bold';
    statusEl.textContent = '● En Hora · En Marcha';
    if (alertBox) alertBox.classList.add('hidden');
  }

  const favBtn = document.getElementById('sheet-btn-fav');
  const isFav = favoriteTrains.has(train.id);
  if (favBtn) {
    favBtn.innerHTML = isFav ? '❤️ Siguiendo viaje' : '🤍 Seguir este tren';
  }

  const stopsContainer = document.getElementById('sheet-stops-timeline');
  if (stopsContainer && train.route.stops) {
    stopsContainer.innerHTML = train.route.stops
      .map((st, idx) => {
        const isCurrent = idx === 1;
        const dotStyle = idx === 0 ? 'bg-[#00E676]' : isCurrent ? 'bg-[#FFC107] animate-pulse' : 'bg-zinc-600';
        return `
          <div class="flex items-center gap-3 text-sm">
            <span class="w-2.5 h-2.5 rounded-full ${dotStyle} shrink-0"></span>
            <span class="${isCurrent ? 'font-bold text-amber-400' : 'text-zinc-300'} flex-1">${st}</span>
            <span class="text-xs font-mono text-zinc-400">${idx === 0 ? 'Salida' : isCurrent ? 'Próxima parada' : 'Programada'}</span>
          </div>
        `;
      })
      .join('');
  }
}

function toggleFavoriteActiveTrain() {
  if (!selectedTrainId) return;
  const train = trainsData.find((t) => t.id === selectedTrainId);
  if (!train) return;

  if (favoriteTrains.has(train.id)) {
    favoriteTrains.delete(train.id);
    showToast(`💔 Has dejado de seguir el ${train.displayName}`);
  } else {
    favoriteTrains.set(train.id, { id: train.id, name: train.displayName });
    showToast(`❤️ Siguiendo a ${train.displayName}. Te avisaremos de sus paradas.`);
  }

  savePersistedFavorites();
  populateTrainBottomSheet(train);
  renderFavoriteTrainsSection();
  renderHomeNearbyTrains();
  if (map) renderMapMarkers();
}

function renderFavoriteTrainsSection() {
  const wrapper = document.getElementById('home-fav-trains-wrapper');
  const container = document.getElementById('home-fav-trains-list');
  if (!wrapper || !container) return;

  const favIds = Array.from(favoriteTrains.keys());
  const activeFavs = trainsData.filter((t) => favIds.includes(t.id));

  if (activeFavs.length === 0) {
    wrapper.classList.add('hidden');
    return;
  }

  wrapper.classList.remove('hidden');
  container.innerHTML = activeFavs
    .map((t) => {
      return `
        <div onclick="openTrainSheet('${t.id}', false)" class="b2c-card b2c-card-interactive cursor-pointer flex items-center justify-between border-emerald-500/40">
          <div class="flex items-center gap-2.5">
            <span>❤️</span>
            <div>
              <p class="font-bold text-sm">${t.displayName} <span class="text-xs font-normal text-zinc-400">(${t.route.origin} ➔ ${t.route.destination})</span></p>
              <p class="text-xs text-emerald-400 font-mono">📍 Junto a ${t.nearestStation ? t.nearestStation.name : 'vía'} · ${t.speed} km/h</p>
            </div>
          </div>
          <span class="material-symbols-outlined text-zinc-400">chevron_right</span>
        </div>
      `;
    })
    .join('');
}

// --- 12. PESTAÑA 3: BILLETES (ESTILO TRAINLINE / OMIO - PREPARADO AFILIADOS) ---
function initTicketDefaults() {
  const dateInput = document.getElementById('ticket-date-input');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.min = today;
  }
  searchAffiliateTickets();
}

function swapTicketStations() {
  const origEl = document.getElementById('ticket-origin');
  const destEl = document.getElementById('ticket-destination');
  if (!origEl || !destEl) return;
  const temp = origEl.value;
  origEl.value = destEl.value;
  destEl.value = temp;
  searchAffiliateTickets();
}

function searchAffiliateTickets(e) {
  if (e) e.preventDefault();
  const origin = document.getElementById('ticket-origin')?.value || 'Madrid Puerta de Atocha';
  const destination = document.getElementById('ticket-destination')?.value || 'Barcelona Sants';
  const dateVal = document.getElementById('ticket-date-input')?.value || 'Hoy';

  const resultsContainer = document.getElementById('ticket-results-container');
  const routeHeader = document.getElementById('ticket-results-header');
  if (!resultsContainer) return;

  if (origin === destination) {
    resultsContainer.innerHTML = `<div class="b2c-card text-center text-sm text-amber-400">Selecciona una estación de origen y destino diferentes.</div>`;
    return;
  }

  if (routeHeader) {
    routeHeader.textContent = `${origin.split(' ')[0]} ➔ ${destination.split(' ')[0]} · ${dateVal}`;
  }

  // =========================================================================
  // [INTEGRACIÓN AFILIADOS TRAINLINE / OMIO]
  // Sustituir AFFILIATE_BASE_URL por tu enlace de afiliado de Partnerize / Awin
  // Ejemplo: https://prf.hn/click/camref:XXXX/destination:https://www.thetrainline.com
  // =========================================================================
  const AFFILIATE_BASE_URL = 'https://www.thetrainline.com/es/horarios-trenes';
  const queryParams = `?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(dateVal)}&utm_source=vialibre_app`;
  const affiliateUrl = `${AFFILIATE_BASE_URL}${queryParams}`;

  const sampleOffers = [
    { operator: 'Avlo / Ouigo', badge: '🔥 Mejor Precio', dep: '07:25', arr: '10:05', duration: '2h 40m', type: 'Directo · Alta Velocidad', price: '19,00 €', highlight: true },
    { operator: 'Renfe AVE', badge: '⚡ Más Rápido', dep: '09:00', arr: '11:30', duration: '2h 30m', type: 'Directo · Confort', price: '35,50 €', highlight: false },
    { operator: 'iryo Inicial', badge: '✨ Flexible', dep: '12:15', arr: '14:55', duration: '2h 40m', type: 'Directo · WiFi Gratis', price: '24,00 €', highlight: false },
    { operator: 'Renfe Alvia / MD', badge: 'Estándar', dep: '16:40', arr: '19:30', duration: '2h 50m', type: 'Directo', price: '28,90 €', highlight: false }
  ];

  resultsContainer.innerHTML = sampleOffers
    .map((offer) => {
      return `
        <div class="b2c-card flex flex-col gap-3 ${offer.highlight ? 'border-emerald-500/50' : ''}">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-bold text-xs px-2.5 py-0.5 rounded-md bg-white/10 text-zinc-200">${offer.operator}</span>
              <span class="text-xs font-semibold ${offer.highlight ? 'text-[#00E676]' : 'text-zinc-400'}">${offer.badge}</span>
            </div>
            <span class="text-xs text-zinc-400">${offer.type}</span>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div>
                <p class="font-mono font-bold text-lg leading-none">${offer.dep}</p>
                <p class="text-[11px] text-zinc-400 mt-1">${origin.split(' ')[0]}</p>
              </div>
              <div class="flex flex-col items-center px-2">
                <span class="text-[10px] text-zinc-400 font-mono">${offer.duration}</span>
                <div class="w-14 h-[2px] bg-zinc-600 my-1 relative">
                  <span class="w-2 h-2 rounded-full bg-[#00E676] absolute -top-[3px] right-0"></span>
                </div>
              </div>
              <div>
                <p class="font-mono font-bold text-lg leading-none">${offer.arr}</p>
                <p class="text-[11px] text-zinc-400 mt-1">${destination.split(' ')[0]}</p>
              </div>
            </div>

            <div class="text-right">
              <p class="text-[11px] text-zinc-400">Desde</p>
              <p class="font-mono font-extrabold text-xl text-[#00E676]">${offer.price}</p>
            </div>
          </div>

          <!-- Botón de conversión de Afiliados -->
          <a href="${affiliateUrl}" target="_blank" rel="noopener noreferrer"
             onclick="trackAffiliateClick('${offer.operator}', '${offer.price}')"
             class="w-full py-2.5 px-4 rounded-xl bg-[#00E676] hover:bg-[#00c864] text-[#002912] font-bold text-sm flex items-center justify-center gap-1.5 transition-colors no-underline">
            <span>Comprar Billete</span>
            <span class="material-symbols-outlined text-[18px]">open_in_new</span>
          </a>
        </div>
      `;
    })
    .join('');
}

function trackAffiliateClick(operator, price) {
  // [INTEGRACIÓN ANALÍTICA AFILIADOS: Google Analytics / Mixpanel]
  showToast(`🎟️ Redirigiendo a reserva oficial (${operator} - ${price})...`);
}

// --- 13. PESTAÑA 4: PERFIL, TEMA, FIREBASE AUTH Y MONETIZACIÓN PRO ---
function initTheme() {
  let saved = 'dark';
  try {
    saved = localStorage.getItem('vialibre_theme') || 'dark';
  } catch (e) {}
  setTheme(saved === 'light');
}

function toggleTheme(checkboxEl) {
  const toLight = checkboxEl ? !checkboxEl.checked : isDarkMode;
  setTheme(toLight);
}

function setTheme(toLight) {
  isDarkMode = !toLight;
  const htmlEl = document.documentElement;
  const bodyEl = document.body;
  const darkSwitch = document.getElementById('switch-dark-mode');

  if (toLight) {
    htmlEl.classList.remove('dark');
    htmlEl.classList.add('light');
    bodyEl.classList.add('light-theme');
    if (darkSwitch) darkSwitch.checked = false;
    try { localStorage.setItem('vialibre_theme', 'light'); } catch (e) {}
  } else {
    htmlEl.classList.remove('light');
    htmlEl.classList.add('dark');
    bodyEl.classList.remove('light-theme');
    if (darkSwitch) darkSwitch.checked = true;
    try { localStorage.setItem('vialibre_theme', 'dark'); } catch (e) {}
  }
}

// =========================================================================
// [INTEGRACIÓN MONETIZACIÓN: STRIPE CHECKOUT / REVENUECAT - ÁREA PREMIUM]
// Si el usuario NO es PRO e intenta activar las Alertas en Tiempo Real,
// lanzamos automáticamente el Popup / Paywall de Suscripción PRO.
// =========================================================================
function handleProNotificationToggle(checkbox) {
  if (!isUserPro) {
    checkbox.checked = false;
    openProPaywallModal();
    return;
  }
  const enabled = checkbox.checked;
  showToast(enabled ? '🔔 Alertas PRO en tiempo real activadas' : '🔕 Alertas desactivadas');
}

function openProPaywallModal() {
  const modal = document.getElementById('modal-pro-paywall');
  if (modal) modal.classList.remove('hidden');
}

function closeProPaywallModal() {
  const modal = document.getElementById('modal-pro-paywall');
  if (modal) modal.classList.add('hidden');
}

function startStripeProCheckout(planType) {
  // [INTEGRACIÓN STRIPE CHECKOUT]
  // Aquí redirigirás a tu Stripe Payment Link o sesión de Stripe Checkout:
  // window.location.href = planType === 'annual' ? 'https://buy.stripe.com/TU_LINK_ANUAL' : 'https://buy.stripe.com/TU_LINK_MENSUAL';

  isUserPro = true;
  try { localStorage.setItem('vialibre_is_pro', 'true'); } catch (e) {}

  updateProUIState();
  closeProPaywallModal();
  const proToggle = document.getElementById('switch-pro-alerts');
  if (proToggle) proToggle.checked = true;

  showToast(`🎉 ¡Bienvenido a Vía Libre PRO (${planType === 'annual' ? 'Anual' : 'Mensual'})! Anuncios eliminados y alertas activas.`);
}

function updateProUIState() {
  const adBanner = document.getElementById('admob-home-slot');
  const proBadge = document.getElementById('profile-pro-status-badge');
  if (isUserPro) {
    if (adBanner) adBanner.classList.add('hidden');
    if (proBadge) {
      proBadge.textContent = '⭐ MIEMBRO PRO ACTIVO';
      proBadge.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#00E676] text-[#002912]';
    }
  }
}

// =========================================================================
// [INTEGRACIÓN FIREBASE AUTH: INICIAR SESIÓN / REGISTRARSE]
// Punto de conexión para firebase.auth().signInWithPopup(new GoogleAuthProvider())
// =========================================================================
function openAuthModal() {
  const modal = document.getElementById('modal-firebase-auth');
  if (modal) modal.classList.remove('hidden');
}

function closeAuthModal() {
  const modal = document.getElementById('modal-firebase-auth');
  if (modal) modal.classList.add('hidden');
}

function handleFirebaseLogin(providerName) {
  // [INTEGRACIÓN FIREBASE AUTH]
  currentUser = {
    name: providerName === 'Google' ? 'Viajero Conectado' : 'Usuario Vía Libre',
    email: 'viajero@vialibre.app'
  };
  const nameEl = document.getElementById('profile-user-name');
  const subEl = document.getElementById('profile-user-email');
  const btnAuth = document.getElementById('btn-profile-auth');

  if (nameEl) nameEl.textContent = currentUser.name;
  if (subEl) subEl.textContent = 'Sincronización en la nube activa ✅';
  if (btnAuth) btnAuth.textContent = 'Conectado';

  closeAuthModal();
  showToast(`✅ Sesión iniciada con ${providerName}`);
}

// --- 14. PERSISTENCIA LOCAL Y UTILIDADES UI ---
function loadPersistedState() {
  try {
    const rawRoutes = localStorage.getItem('vialibre_saved_routes');
    if (rawRoutes) {
      savedCommuteRoutes = JSON.parse(rawRoutes);
    } else {
      // Ruta de ejemplo inicial (Dos Hermanas -> Sevilla)
      savedCommuteRoutes = [
        { origin: 'Dos Hermanas', destination: 'Sevilla Santa Justa', line: 'Cercanías C1 / MD' }
      ];
    }

    const rawFavs = localStorage.getItem('vialibre_fav_trains');
    if (rawFavs) {
      const arr = JSON.parse(rawFavs);
      arr.forEach((item) => favoriteTrains.set(item.id, item));
    }

    isUserPro = localStorage.getItem('vialibre_is_pro') === 'true';
    updateProUIState();
  } catch (e) {}
}

function savePersistedFavorites() {
  try {
    const arr = Array.from(favoriteTrains.values());
    localStorage.setItem('vialibre_fav_trains', JSON.stringify(arr));
  } catch (e) {}
}

function triggerPwaInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
  } else {
    showToast('📲 En iOS pulsa "Compartir" ➔ "Añadir a pantalla de inicio". En Android usa el menú del navegador.');
  }
}

function showLegalModal(title, content) {
  const modal = document.getElementById('modal-legal-info');
  if (!modal) return;
  document.getElementById('legal-modal-title').textContent = title;
  document.getElementById('legal-modal-body').textContent = content;
  modal.classList.remove('hidden');
}

function closeLegalModal() {
  const modal = document.getElementById('modal-legal-info');
  if (modal) modal.classList.add('hidden');
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'px-4 py-3 rounded-2xl bg-[#1E1E1E] border border-[#00E676]/50 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 transition-all duration-300';
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

}
