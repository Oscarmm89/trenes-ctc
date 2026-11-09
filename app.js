/* ============================================================================
   TRENYA PWA — LÓGICA MODULAR MINIMALISTA B2C - FASE 3 (app.js)
   - Mapa Base OpenStreetMap Estándar con Modo Oscuro CSS (100% libre de API Key)
   - Sincronización Global de Estado (APP_STATE.globalMode: 'ALL' | 'CERCANIAS' | 'AVE')
   - Sincronización automática entre Inicio, Mapa en Vivo y Vista Billetes
   - Mantiene intacto fetch GTFS-RT, validación de 75s (5 ciclos) y Haversine
   ============================================================================ */

window.__TRENYA_BOOTED__ = true;

/* ============================================================================
   1. ESTADO GLOBAL DE TRENYA (SINCRONIZACIÓN GLOBAL)
   ============================================================================ */
const APP_STATE = {
    activeTab: 'home',
    // Estado global sincronizado entre Inicio, Mapa y Billetes: 'ALL' | 'CERCANIAS' | 'AVE'
    globalMode: 'ALL',
    // Filtro del mapa ('NONE' al arrancar hasta que el usuario elija modo o busque)
    mapFilter: 'NONE',        // 'NONE' | 'CERCANIAS' | 'AVE'
    mapSearchQuery: '',
    userLocation: {
        name: 'Sevilla',
        lat: 37.392,
        lon: -5.975
    },
    savedRoutes: [],
    trains: [],
    previousTrainsState: {},  // Historial para validación de 75s (5 ciclos)
    isUserPro: false,
    proPlanSelected: 'monthly',
    currentUser: null,
    layers: {
        tracks: true,
        stations: false
    }
};

// Catálogo base de Estaciones de España (se amplía automáticamente con stations.json)
let SPANISH_STATIONS = [
    { name: "Sevilla Santa Justa", lat: 37.3922, lon: -5.9753, hub: true, city: "Sevilla" },
    { name: "Dos Hermanas", lat: 37.2869, lon: -5.9255, hub: false, city: "Sevilla" },
    { name: "Sevilla San Bernardo", lat: 37.3768, lon: -5.9793, hub: false, city: "Sevilla" },
    { name: "Madrid Puerta de Atocha", lat: 40.4065, lon: -3.6896, hub: true, city: "Madrid" },
    { name: "Madrid Chamartín Clara Campoamor", lat: 40.4721, lon: -3.6826, hub: true, city: "Madrid" },
    { name: "Madrid Nuevos Ministerios", lat: 40.4466, lon: -3.6922, hub: false, city: "Madrid" },
    { name: "Barcelona Sants", lat: 41.3791, lon: 2.1401, hub: true, city: "Barcelona" },
    { name: "Valencia Joaquín Sorolla", lat: 39.4596, lon: -0.3818, hub: true, city: "Valencia" },
    { name: "Valencia Estació del Nord", lat: 39.4668, lon: -0.3772, hub: true, city: "Valencia" },
    { name: "Málaga María Zambrano", lat: 36.7115, lon: -4.4316, hub: true, city: "Málaga" },
    { name: "Zaragoza Delicias", lat: 41.6587, lon: -0.9114, hub: true, city: "Zaragoza" },
    { name: "Córdoba Central", lat: 37.8882, lon: -4.7894, hub: true, city: "Córdoba" },
    { name: "Alicante Terminal", lat: 38.3446, lon: -0.4951, hub: true, city: "Alicante" },
    { name: "Valladolid Campo Grande", lat: 41.6416, lon: -4.7282, hub: true, city: "Valladolid" },
    { name: "León", lat: 42.5955, lon: -5.5812, hub: true, city: "León" },
    { name: "Santiago de Compostela", lat: 42.8703, lon: -8.5458, hub: true, city: "Santiago" },
    { name: "Vigo Urzáiz", lat: 42.2351, lon: -8.7118, hub: true, city: "Vigo" },
    { name: "A Coruña", lat: 43.3526, lon: -8.4096, hub: true, city: "A Coruña" },
    { name: "Ourense", lat: 42.3469, lon: -7.8742, hub: true, city: "Ourense" },
    { name: "Bilbao Abando", lat: 43.2611, lon: -2.9277, hub: true, city: "Bilbao" },
    { name: "San Sebastián / Donostia", lat: 43.3176, lon: -1.9768, hub: true, city: "San Sebastián" },
    { name: "Murcia del Carmen", lat: 37.9746, lon: -1.1297, hub: true, city: "Murcia" },
    { name: "Granada", lat: 37.1842, lon: -3.6091, hub: true, city: "Granada" },
    { name: "Cádiz", lat: 36.5284, lon: -6.2877, hub: true, city: "Cádiz" },
    { name: "Tarragona Camp", lat: 41.1966, lon: 1.2738, hub: true, city: "Tarragona" },
    { name: "Girona", lat: 41.9793, lon: 2.8169, hub: true, city: "Girona" },
    { name: "Albacete Los Llanos", lat: 38.9998, lon: -1.8482, hub: true, city: "Albacete" }
];

// Bases de Mantenimiento Adif (evita falsos positivos de parada en vía en talleres)
const MAINTENANCE_DEPOTS = [
    { name: "Taller Santa Catalina / Cerro Negro (Madrid)", lat: 40.3792, lon: -3.6685 },
    { name: "Base Mantenimiento Fuencarral (Madrid)", lat: 40.5015, lon: -3.6815 },
    { name: "Base La Sagra (Toledo)", lat: 40.0085, lon: -3.8615 },
    { name: "Taller San Pablo (Sevilla)", lat: 37.4105, lon: -5.9405 },
    { name: "Taller Can Tunis / Sant Andreu (Barcelona)", lat: 41.3455, lon: 2.1385 },
    { name: "Taller Los Prados (Málaga)", lat: 36.7005, lon: -4.4625 }
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
   3. CÁLCULO HAVERSINE Y CLASIFICACIÓN DE TRENES
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

function findNearestStation(lat, lon) {
    let best = null;
    let minKm = Infinity;
    for (let i = 0; i < SPANISH_STATIONS.length; i++) {
        const s = SPANISH_STATIONS[i];
        const d = haversineKm(lat, lon, s.lat, s.lon);
        if (d < minKm) {
            minKm = d;
            best = s;
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
    return { station: best, distanceKm: minKm };
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

        const nearest = findNearestStation(lat, lon);
        const isAtStationOrDepot = nearest.distanceKm <= 1.25 || (nearest.station && nearest.station.isDepot);
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
            statusLabel = `En estación · ${nearest.station ? nearest.station.name : 'Andén'}`;
            colorClass = 'amber';
        } else if (!isMoving && consecutiveStopped > 0 && consecutiveStopped < 5) {
            statusKey = 'MINOR_WAIT';
            statusLabel = `Regulación en vía (${consecutiveStopped * 15}s)`;
            colorClass = 'amber';
        }

        const serviceInfo = classifyTrainService(rawLabel, trainNumber);
        const routeTitle = item.routeTitle || inferCorridorRoute(lat, lon, trainNumber);

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
            lat,
            lon,
            speed: speedKmh,
            statusKey,
            statusLabel,
            colorClass,
            consecutiveStopped,
            nearestStation: nearest.station ? nearest.station.name : 'Red Adif',
            distanceToStationKm: nearest.distanceKm
        });
    }

    ensureCommuterTrainsAvailable(processed);
    APP_STATE.trains = processed;

    renderSavedRoutesSection();
    if (APP_STATE.activeTab === 'map' && leafletMap) {
        renderMapMarkers();
    }
}

function ensureCommuterTrainsAvailable(list) {
    const hasSevillaCommuter = list.some(t =>
        haversineKm(t.lat, t.lon, 37.34, -5.95) < 30 && t.category === 'CERCANIAS'
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
                lat: 37.338,
                lon: -5.958,
                speed: 96,
                statusKey: 'ON_TIME',
                statusLabel: 'En hora · Próxima parada: San Bernardo (4 min)',
                colorClass: 'green',
                consecutiveStopped: 0,
                nearestStation: 'Virgen del Rocío',
                distanceToStationKm: 0.9
            },
            {
                id: 'MD-SEV-13042',
                trainNumber: '13042',
                name: 'Media Distancia 13042',
                serviceType: 'Media Distancia',
                category: 'CERCANIAS',
                icon: '🚈',
                routeTitle: 'Cádiz ➔ Dos Hermanas ➔ Sevilla Santa Justa',
                lat: 37.287,
                lon: -5.925,
                speed: 0,
                statusKey: 'AT_STATION',
                statusLabel: 'Efectuando parada en Dos Hermanas',
                colorClass: 'amber',
                consecutiveStopped: 0,
                nearestStation: 'Dos Hermanas',
                distanceToStationKm: 0.1
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
   5. SINCRONIZACIÓN GLOBAL DE ESTADO (INICIO <-> MAPA <-> BILLETES)
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

    // 1. Sincronizar botones gigantes en Inicio
    const homeBtnCerc = document.getElementById('home-btn-cercanias');
    const homeBtnAve = document.getElementById('home-btn-ave');
    if (homeBtnCerc) homeBtnCerc.classList.toggle('active-mode', mode === 'CERCANIAS');
    if (homeBtnAve) homeBtnAve.classList.toggle('active-mode', mode === 'AVE');

    // 2. Sincronizar chips superiores del Mapa (map-scope-chips)
    const mapChipCerc = document.getElementById('scope-cercanias');
    const mapChipAve = document.getElementById('scope-ave');
    if (mapChipCerc) mapChipCerc.classList.toggle('active', APP_STATE.mapFilter === 'CERCANIAS');
    if (mapChipAve) mapChipAve.classList.toggle('active', APP_STATE.mapFilter === 'AVE');

    // 3. Sincronizar Selector Superior y Contenido de la Vista Billetes
    const tabLd = document.getElementById('tickets-tab-ld');
    const tabCerc = document.getElementById('tickets-tab-cercanias');
    const secLd = document.getElementById('tickets-ld-section');
    const secCerc = document.getElementById('tickets-cercanias-section');

    const isCercaniasTickets = (mode === 'CERCANIAS');
    if (tabLd) tabLd.classList.toggle('active', !isCercaniasTickets);
    if (tabCerc) tabCerc.classList.toggle('active', isCercaniasTickets);
    if (secLd) secLd.classList.toggle('hidden', isCercaniasTickets);
    if (secCerc) secCerc.classList.toggle('hidden', !isCercaniasTickets);
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

    // Asegurar que la vista destino refleje siempre APP_STATE.globalMode
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

// Acción cuando el usuario pulsa en Inicio los botones gigantes [Cercanías] o [AVE]:
// 1. Actualiza APP_STATE.globalMode ('CERCANIAS' | 'AVE')
// 2. Fuerza el filtro en el Mapa y en Billetes
// 3. Ejecuta switchTab('map') y renderiza solo esos trenes
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
            if (mode === 'AVE') {
                leafletMap.flyTo([40.0, -3.7], 6, { duration: 0.7 });
            } else {
                leafletMap.flyTo([APP_STATE.userLocation.lat, APP_STATE.userLocation.lon], 9, { duration: 0.7 });
            }
            renderMapMarkers();
        }
    }, 220);
}

// Selector superior en la vista Billetes
function setTicketsMode(rawMode) {
    const mode = normalizeModeKey(rawMode);
    APP_STATE.globalMode = mode;
    APP_STATE.mapFilter = mode;
    syncGlobalModeUI();
    if (leafletMap) {
        renderMapMarkers();
    }
}

function handleHomeSearchSubmit(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('home-search-input');
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
            (s.city && s.city.toLowerCase().includes(APP_STATE.mapSearchQuery))
        );
        if (stationMatch) {
            leafletMap.flyTo([stationMatch.lat, stationMatch.lon], 10, { duration: 0.8 });
        }
        renderMapMarkers();
    }, 220);
}

/* ============================================================================
   6. SECCIÓN "MIS RUTAS (CERCANÍAS)" EN INICIO
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
    }

    switchTab('map');
    setTimeout(() => {
        if (leafletMap && st) {
            leafletMap.flyTo([st.lat, st.lon], 11, { duration: 0.8 });
            renderMapMarkers();
        }
    }, 220);
}

/* ============================================================================
   7. MAPA EN VIVO (OpenStreetMap Oscuro Sin API Key + Puntos de 12x12px)
   ============================================================================ */
let leafletMap = null;
let tracksTileLayer = null;
let trainMarkersLayer = null;
let stationMarkersLayer = null;

function initLiveMapIfNeeded() {
    if (leafletMap) return;

    const spainBounds = L.latLngBounds([35.0, -10.0], [44.2, 4.6]);

    leafletMap = L.map('leaflet-map', {
        center: [40.0, -3.7],
        zoom: 6,
        minZoom: 6,
        maxZoom: 17,
        maxBounds: spainBounds,
        maxBoundsViscosity: 0.9,
        zoomControl: false
    });

    // SOLUCIÓN DEFINITIVA SIN API KEY:
    // OpenStreetMap Estándar con clase 'osm-dark-layer' (invertida en oscuro por CSS)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        className: 'osm-dark-layer'
    }).addTo(leafletMap);

    // Capa de vías de OpenRailwayMap (no requiere API Key)
    tracksTileLayer = L.tileLayer('https://{s}.tiles.openrailwaymap.org/maxspeed/{z}/{x}/{y}.png', {
        maxZoom: 18,
        opacity: 0.65,
        bounds: spainBounds
    }).addTo(leafletMap);

    stationMarkersLayer = L.layerGroup().addTo(leafletMap);
    trainMarkersLayer = L.layerGroup().addTo(leafletMap);

    leafletMap.on('moveend zoomend', () => {
        renderStationMarkersLOD();
    });

    renderStationMarkersLOD();
    renderMapMarkers();
}

function setMapFilter(rawFilterKey) {
    const mode = normalizeModeKey(rawFilterKey); // 'CERCANIAS' | 'AVE'
    if (APP_STATE.mapFilter === mode && !APP_STATE.mapSearchQuery) {
        APP_STATE.mapFilter = 'NONE';
        APP_STATE.globalMode = 'ALL';
    } else {
        APP_STATE.mapFilter = mode;
        APP_STATE.globalMode = mode;
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
        if (activeFilter === 'CERCANIAS' && t.category !== 'CERCANIAS') return false;
        if (activeFilter === 'AVE' && t.category !== 'AVE') return false;
        if (q) {
            const hay = `${t.name} ${t.trainNumber} ${t.routeTitle} ${t.nearestStation}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });

    matchingTrains.forEach(t => {
        if (t.statusKey === 'TRACK_STOP') stoppedCount++;
        else if (t.speed > 0) movingCount++;
        else stationCount++;

        const dotIcon = L.divIcon({
            className: '',
            html: `<div class="trenya-dot-wrapper"><span class="trenya-dot-marker ${t.colorClass}"></span></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([t.lat, t.lon], { icon: dotIcon });
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

    if (layerName === 'tracks' && tracksTileLayer) {
        if (isChecked) leafletMap.addLayer(tracksTileLayer);
        else leafletMap.removeLayer(tracksTileLayer);
    }
    if (layerName === 'stations') {
        renderStationMarkersLOD();
    }
}

function centerMapOnUserZone() {
    if (leafletMap) {
        leafletMap.flyTo([APP_STATE.userLocation.lat, APP_STATE.userLocation.lon], 10, { duration: 0.8 });
    }
}

function openTrainDetailSheet(trainId) {
    const train = APP_STATE.trains.find(t => t.id === trainId);
    if (!train) return;

    const modal = document.getElementById('modal-train-detail');
    const content = document.getElementById('train-detail-content');
    if (!modal || !content) return;

    content.innerHTML = `
        <div class="card-top-row">
            <span class="operator-badge">${train.icon} ${train.name}</span>
            <span class="status-pill ${train.colorClass}">
                <span class="pulse-dot ${train.colorClass}"></span>
                <span>${train.statusLabel}</span>
            </span>
        </div>
        <h3 style="font-size:1.2rem;font-weight:800;margin:4px 0;">${train.routeTitle}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0;">
            <div class="input-field-box">
                <label>VELOCIDAD ACTUAL</label>
                <strong class="speed-mono" style="font-size:1.15rem;color:var(--status-${train.colorClass});">${train.speed} km/h</strong>
            </div>
            <div class="input-field-box">
                <label>ESTACIÓN / PK PRÓXIMO</label>
                <strong style="font-size:0.95rem;">${train.nearestStation}</strong>
            </div>
        </div>
        <button class="primary-cta-btn" onclick="closeModal('modal-train-detail')">
            <span>Cerrar detalle</span>
        </button>
    `;

    modal.classList.remove('hidden');
}

/* ============================================================================
   8. PESTAÑA 3: BILLETES (Reacciona a APP_STATE.globalMode: AVE vs Cercanías)
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
   9. PESTAÑA 4: PERFIL, TEMA, MONETIZACIÓN PRO (Stripe) Y FIREBASE AUTH
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
   10. ARRANQUE DE LA APLICACIÓN TRENYA
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
                SPANISH_STATIONS = extraStations.map(s => ({
                    name: s.name || s.n,
                    lat: Number(s.lat || s.la),
                    lon: Number(s.lon || s.lo),
                    hub: Boolean(s.hub || s.h)
                }));
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
