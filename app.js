console.log("Comedores App Booting (Cloud Mode)...");
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error(msg, url, lineNo, columnNo, error);
    return false;
};

// ═══════════════════════════════════════════════════════════════
// CLOUD PERSISTENCE — Direct GitHub Gist API from the browser
// ═══════════════════════════════════════════════════════════════
const _CLOUD = {
    token: (window._GITHUB_TOKEN || ''),
    gistId: (window._GIST_ID || ''),
    role: (window._USER_ROLE || 'viewer'),
    username: (window._USERNAME || ''),
};
const _isAdmin = _CLOUD.role === 'admin';

async function saveToCloud() {
    if (!_CLOUD.token || !_CLOUD.gistId) { alert('Error: credenciales de nube no configuradas.'); return; }
    const btns = [document.getElementById('cloud-save-btn'), document.getElementById('cloud-save-btn-cocina')].filter(Boolean);
    btns.forEach(b => { b.textContent = '⏳ Guardando...'; b.disabled = true; });
    try {
        const resp = await fetch(`https://api.github.com/gists/${_CLOUD.gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${_CLOUD.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: { 'state.json': { content: JSON.stringify(state) } }
            })
        });
        if (resp.ok) {
            btns.forEach(b => { b.textContent = '✅ Guardado!'; b.style.background = '#10b981'; });
            setTimeout(() => { btns.forEach(b => { b.textContent = '☁️ Guardar en la Nube'; b.style.background = ''; b.disabled = false; }); }, 2500);
        } else {
            throw new Error(`HTTP ${resp.status}`);
        }
    } catch (e) {
        console.error('Cloud save failed:', e);
        btns.forEach(b => { b.textContent = '❌ Error'; b.disabled = false; });
        setTimeout(() => { btns.forEach(b => { b.textContent = '☁️ Guardar en la Nube'; b.style.background = ''; }); }, 3000);
    }
}
window.saveToCloud = saveToCloud;

// Role-based UI restrictions (called after every render)
function applyRoleRestrictions() {
    const selectors = [
        '#add-resident-btn', '#add-table-btn', '#add-dr-btn',
        '#edit-current-dr-btn', '.dr-item-actions', '.table-actions',
        '#dish-form button[type="submit"]', '#delete-dish-btn',
        '#ai-gen-prep-btn', '#merge-section', '.import-section',
    ];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.style.display = _isAdmin ? '' : 'none';
        });
    });
    if (!_isAdmin) {
        document.querySelectorAll('.resident').forEach(el => {
            el.setAttribute('draggable', 'false');
            el.style.cursor = 'default';
        });
        document.querySelectorAll('.resident .icon-btn.danger').forEach(el => el.style.display = 'none');
    }
    const saveBtn = document.getElementById('cloud-save-btn');
    if (saveBtn) saveBtn.style.display = _isAdmin ? '' : 'none';
    const saveBtnCocina = document.getElementById('cloud-save-btn-cocina');
    if (saveBtnCocina) saveBtnCocina.style.display = _isAdmin ? '' : 'none';
    const roleEl = document.getElementById('role-indicator');
    if (roleEl) {
        roleEl.textContent = _isAdmin ? '👑 Admin' : '👀 Visor';
        roleEl.style.background = _isAdmin ? '#f59e0b' : '#64748b';
    }
    const roleElCocina = document.getElementById('role-indicator-cocina');
    if (roleElCocina) {
        roleElCocina.textContent = _isAdmin ? '👑 Admin' : '👀 Visor';
        roleElCocina.style.background = _isAdmin ? '#f59e0b' : '#64748b';
    }
}
window.applyRoleRestrictions = applyRoleRestrictions;

const defaultState = {
    venues: [
        { id: 'mburucuya', name: 'Mburucuyá' },
        { id: 'dominicana', name: 'Dominicana' }
    ],
    activeVenueId: 'mburucuya',
    diningRooms: [
        { id: 'dr_mb_1', name: 'Comedor Principal', venueId: 'mburucuya' },
        { id: 'dr_dom_1', name: 'Planta Alta', venueId: 'dominicana' },
        { id: 'dr_dom_2', name: 'Planta Baja', venueId: 'dominicana' }
    ],
    activeDiningRoomId: 'dr_mb_1',
    tables: [], // Start fresh with empty layout for new venues
    residents: [
        { id: 'res_1', name: 'Marta Plasencia', diet: 'basal', consistency: 'normal', thickener: 'none', tableId: 'table_1' },
        { id: 'res_2', name: 'Dolores Montoya', diet: 'proteccion_gastrica', consistency: 'triturado', thickener: 'nectar', tableId: 'table_1' },
        { id: 'res_3', name: 'Eduard Estiarte', diet: 'proteccion_renal', consistency: 'precortado', thickener: 'miel', tableId: 'table_2' },
        { id: 'res_4', name: 'Joan Sardona', diet: 'basal', consistency: 'triturado', thickener: 'pudding', tableId: null },
        { id: 'res_5', name: 'Teresa Lletche', diet: 'basal', consistency: 'normal', thickener: 'none', tableId: 'table_3' }
    ]
};

// Load state: prefer cloud-injected state, then localStorage, then defaults
let state;
if (window._CLOUD_STATE && Object.keys(window._CLOUD_STATE).length > 0) {
    state = JSON.parse(JSON.stringify(window._CLOUD_STATE));
    console.log('State loaded from cloud.');
} else {
    try { state = JSON.parse(localStorage.getItem('comedores_state')); } catch(e) { state = null; }
    if (!state) state = JSON.parse(JSON.stringify(defaultState));
    console.log('State loaded from localStorage/defaults.');
}

(function restoreData() {
    // Skip if state already has data (from cloud)
    if (window._CLOUD_STATE && Object.keys(window._CLOUD_STATE).length > 0) return;
    const domNames = [
        "Lucia Aguilera", "Maria Alcaraz", "Guillermo Alvarez", "Carmen Baez", "Agnes Beyersdorff",
        "Maria Bordon", "Maria Bozzano", "Lorna Brooking", "Edith Caballero", "Mario Cano",
        "Olga Carlstein", "Selva Casco", "Carlos Céspedes", "Mary Corrales", "Arnaldo Costa",
        "Juana Cristaldo", "Berna Gauto", "Victorino Gonzalez", "Maria Guerrero", "Mirecha Guggiari",
        "Augusto Lezcano", "Elena Lopez", "Nidia Manchini", "Fermina Marin", "Elena Mazoti",
        "Francisco Mena", "Delfina Meza", "Myrian Murdoch", "Aristides Quevedo", "Alicia Ramo",
        "Myrian Riquelme", "Lucila Scelza", "Ursula Schesmer", "Maria Vasquez", "Gladys Velilla",
        "Elena Vera", "Sara Vera", "Teresa Zuzulich"
    ];
    const mbuNames = [
        "Pedro Araujo", "Teodora Benitez", "Miriam Chamorro", "Ydalina Cortessi", "Raquel Davila",
        "Olga Ferreira", "Francisca Frizza", "Josefa Garcia", "Martha Heisecke", "Olga Hill",
        "Artur Lampelzammer", "Osvaldo Laterza", "Adalberto Mendoza", "Maria Miranda", "Yolanda Montiel",
        "Norha Netto", "Juan Orrego", "Theo Oude", "Maria Perez", "Graciela Petit",
        "Gladys Prieto", "Carmen Quintana", "Maria Robbiani", "Francisco Robles", "Maria Rodriguez",
        "Ricardo Santilli", "Maria Schupp", "Félix Stiegwardt", "Gladis Talavera", "Cynthia Zaputovich"
    ];

    if (!state || !state.residents || state.residents.length < 60 || !state.tables || state.tables.length === 0) {
        if (!state.residents || state.residents.length < 60) {
            state.residents = [];
            let idCount = Date.now();
            domNames.forEach(name => {
                state.residents.push({
                    id: 'res_restore_' + idCount++, name: name, diet: 'basal', consistency: 'normal', thickener: 'none', supplement: false, assistance: false, venueId: 'dominicana', tableId: null, seatIndex: null
                });
            });
            mbuNames.forEach(name => {
                state.residents.push({
                    id: 'res_restore_' + idCount++, name: name, diet: 'basal', consistency: 'normal', thickener: 'none', supplement: false, assistance: false, venueId: 'mburucuya', tableId: null, seatIndex: null
                });
            });
        }
        
        if (!state.tables || state.tables.length === 0) {
            state.tables = [];
            let tableIdCount = Date.now();
            
            // Recrear 6 mesas en cada comedor
            const diningRooms = state.diningRooms || defaultState.diningRooms;
            diningRooms.forEach(dr => {
                for (let i = 1; i <= 6; i++) {
                    state.tables.push({
                        id: 'table_' + tableIdCount++,
                        diningRoomId: dr.id,
                        name: 'Mesa ' + i,
                        shape: 'circle',
                        capacity: 6,
                        width: 150,
                        height: 150,
                        x: 50 + ((i - 1) % 3) * 300, // Disponer en 2 filas de 3 mesas
                        y: 50 + Math.floor((i - 1) / 3) * 300
                    });
                }
            });
        }
        
        try { localStorage.setItem('comedores_state', JSON.stringify(state)); } catch(e) {}
    }
})();

// Robust State Initialization & Repair
function validateState() {
    if (!state || typeof state !== 'object') {
        state = JSON.parse(JSON.stringify(defaultState));
    }
    
    const repairArray = (key, defaultVal) => {
        if (!Array.isArray(state[key])) state[key] = [...(defaultVal || [])];
    };

    repairArray('venues', defaultState.venues);
    repairArray('diningRooms', defaultState.diningRooms);
    repairArray('residents', defaultState.residents);
    repairArray('tables', defaultState.tables);
    repairArray('diets', []);
    repairArray('dishes', []);
    
    if (typeof state.activeVenueId !== 'string') state.activeVenueId = 'mburucuya';
    if (!state.activeDiningRoomId) {
        const first = state.diningRooms.find(dr => dr.venueId === state.activeVenueId);
        state.activeDiningRoomId = first ? first.id : (state.diningRooms[0]?.id || '');
    }
    if (typeof state.menuCycles !== 'object') state.menuCycles = {};
    if (state.diningRooms.length === 0) {
        state.diningRooms = JSON.parse(JSON.stringify(defaultState.diningRooms));
    }
}
validateState();


function saveState() {
    try { localStorage.setItem('comedores_state', JSON.stringify(state)); } catch(e) {}
}

// DOM Nodes
const diningRoom = document.getElementById('dining-room');
const unassignedList = document.getElementById('unassigned-residents');
const drList = document.getElementById('dr-list');

// Modals
const residentModal = document.getElementById('resident-modal');
const residentForm = document.getElementById('resident-form');
const tableModal = document.getElementById('table-modal');
const tableForm = document.getElementById('table-form');
const drModal = document.getElementById('dr-modal');
const drForm = document.getElementById('dr-form');

// Navigation
window.switchModule = function(moduleName) {
    document.querySelectorAll('.app-module').forEach(m => m.classList.remove('active'));
    document.getElementById('module-' + moduleName).classList.add('active');
    document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('dock-' + moduleName).classList.add('active');
    renderApp(); // Global redraw on switch
};

// Initialize
function renderApp() {
    saveState();
    const standardDiets = [
        { id: 'basal', name: 'General (Basal)', color: '#10b981' },
        { id: 'sin_gluten', name: 'Celíaca (Sin Gluten)', color: '#eab308' },
        { id: 'colaboradores', name: 'Colaboradores (Col)', color: '#64748b' },
        { id: 'vegetariana', name: 'Vegetariana (Veg)', color: '#84cc16' },
        { id: 'blanda', name: 'Blanda (Bla)', color: '#fed7aa' },
        { id: 'sic', name: 'Sindrome I. Corto (SIC)', color: '#06b6d4' },
        { id: 'diabetica', name: 'Diabetica (Dia)', color: '#ea580c' },
        { id: 'liquida', name: 'Líquida (Liq)', color: '#3b82f6' },
        { id: 'triturada', name: 'Triturada (Tra)', color: '#d946ef' },
        { id: 'enteral', name: 'Enteral', color: '#78716c' }
    ];
    
    if(!state.diets) { 
        state.diets = JSON.parse(JSON.stringify(standardDiets));
    } else {
        // Eliminar dietas discontinuadas
        const deprecated = ['proteccion_gastrica', 'proteccion_renal'];
        state.diets = state.diets.filter(d => !deprecated.includes(d.id));
        
        standardDiets.forEach(sd => {
            if(!state.diets.find(d => d.id === sd.id)) {
                state.diets.push({...sd});
            }
        });
    }
    if(!state.dishes) {
        state.dishes = [];
    }
    // Master Resident Lists removed to allow manual deletion and venue assignment without overriding.

    // Ensure venues exist
    if (!state.venues) {
        state.venues = [
            { id: 'mburucuya', name: 'Mburucuyá' },
            { id: 'dominicana', name: 'Dominicana' }
        ];
    }
    if (!state.activeVenueId) state.activeVenueId = 'mburucuya';
    
    // Ensure dining rooms have venueId and match Sedes requests
    if (state.diningRooms.length > 0 && !state.diningRooms[0].venueId) {
        state.diningRooms = [
            { id: 'dr_mb_1', name: 'Comedor Principal', venueId: 'mburucuya' },
            { id: 'dr_dom_1', name: 'Planta Alta', venueId: 'dominicana' },
            { id: 'dr_dom_2', name: 'Planta Baja', venueId: 'dominicana' }
        ];
        state.activeDiningRoomId = 'dr_mb_1';
    }

    try { renderVenues(); } catch(e) { console.error("renderVenues fail", e); }
    try { renderDiets(); } catch(e) { console.error("renderDiets fail", e); }
    try { renderDiningRooms(); } catch(e) { console.error("renderDiningRooms fail", e); }
    try { renderTables(); } catch(e) { console.error("renderTables fail", e); }
    try { renderResidents(); } catch(e) { console.error("renderResidents fail", e); }
    try { renderDishes(); } catch(e) { console.error("renderDishes fail", e); }
    try { if (typeof renderEstimacionTable === 'function') renderEstimacionTable(); } catch(e) { console.error("renderEstimacionTable fail", e); }
    try { updateWorkspaceHeader(); } catch(e) { console.error("updateWorkspaceHeader fail", e); }
    try { updateDebugStatus(); } catch(e) { console.error("updateDebugStatus fail", e); }
    try { applyRoleRestrictions(); } catch(e) { console.error("applyRoleRestrictions fail", e); }
}

function updateDebugStatus() {
    const mbCount = state.residents.filter(r => r.venueId === 'mburucuya').length;
    const domCount = state.residents.filter(r => r.venueId === 'dominicana').length;
    const limboCount = state.residents.filter(r => !r.venueId).length;
    const debugPanel = document.getElementById('debug-status-panel');
    if (debugPanel) {
        debugPanel.innerHTML = `
            <div style="font-size: 0.75rem; color: #64748b; padding: 10px; background: #f1f5f9; border-radius: 6px; margin-top: 20px; border: 1px solid #cbd5e1;">
                <strong>Diagnóstico v33:</strong><br>
                Mb: ${mbCount} | Dom: ${domCount} | Limbo: ${limboCount}<br>
                <div style="display:flex; flex-direction:column; gap:5px; margin-top:10px;">
                    ${limboCount > 0 ? '<button class="btn primary" onclick="rescueLimbo()" style="font-size:0.6rem; padding:4px;">Rescatar Limbo</button>' : ''}
                    <button class="btn secondary" onclick="unassignAllFromVenue('mburucuya')" style="font-size:0.6rem; padding:4px; background:#fee2e2; color:#b91c1c; border-color:#fecaca;">Mandar Mb a "Sin Mesa"</button>
                    <button class="btn secondary" onclick="unassignAllFromVenue('dominicana')" style="font-size:0.6rem; padding:4px; background:#f0fdf4; color:#15803d; border-color:#dcfce7;">Mandar Dom a "Sin Mesa"</button>
                </div>
            </div>
        `;
    }
}

window.unassignAllFromVenue = (venueId) => {
    if (!confirm(`¿Mandar a todos los residentes de "${venueId}" a la lista de "Sin Mesa"? No se borrarán sus dietas, solo se les quitará el asiento.`)) return;
    state.residents.forEach(r => {
        if (r.venueId === venueId) {
            r.tableId = null;
            r.seatIndex = null;
        }
    });
    saveState();
    renderApp();
    alert('Acción completada. Los residentes deberían aparecer ahora en la columna izquierda.');
};


window.rescueLimbo = () => {
    state.residents.forEach(r => { if(!r.venueId) r.venueId = state.activeVenueId; });
    saveState();
    renderApp();
};



function renderVenues() {
    const venuesSelect = document.getElementById('venue-selector');
    if (!venuesSelect) return;
    venuesSelect.innerHTML = '';
    state.venues.forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = v.name;
        option.selected = (v.id === state.activeVenueId);
        venuesSelect.appendChild(option);
    });
}

window.switchVenue = (id) => {
    state.activeVenueId = id;
    // Set active dining room to the first one in this venue
    const firstDR = state.diningRooms.find(dr => dr.venueId === id);
    if (firstDR) state.activeDiningRoomId = firstDR.id;
    
    saveState();
    renderApp();
    renderMenuMatrix();
};

function renderDiets() {
    const legendContainer = document.getElementById('diet-legends-container');
    const select = document.getElementById('res-diet');
    
    if (legendContainer) legendContainer.innerHTML = '';
    if (select) select.innerHTML = '';
    
    state.diets.forEach(d => {
        const isCustom = d.id.startsWith('diet_');
        const deleteBtn = isCustom ? `<button class="icon-btn danger" onclick="deleteDiet('${d.id}')" title="Eliminar dieta" style="font-size: 0.8rem; padding: 0; margin-left: auto;"><ion-icon name="trash-outline"></ion-icon></button>` : '';
        
        const html = `<div class="legend-item" style="margin:0; display:flex; align-items:center; width:100%;"><span class="color-box" style="background:${d.color}"></span> <span style="margin-left: 5px;">${d.name}</span> ${deleteBtn}</div>`;
        if (legendContainer) legendContainer.insertAdjacentHTML('beforeend', html);
        
        if (select) select.insertAdjacentHTML('beforeend', `<option value="${d.id}">${d.name}</option>`);
    });
}

function updateWorkspaceHeader() {
    const dr = state.diningRooms.find(d => d.id === state.activeDiningRoomId);
    if(dr) {
        document.getElementById('workspace-title').textContent = dr.name;
    }
}

// Generate Dining Rooms Sidebar List
function renderDiningRooms() {
    if (!drList) return;
    drList.innerHTML = '';
    
    // Safety check for dining rooms and venues
    if (!state.diningRooms || state.diningRooms.length === 0) {
        state.diningRooms = JSON.parse(JSON.stringify(defaultState.diningRooms));
    }

    const filteredDRs = state.diningRooms.filter(dr => dr.venueId === state.activeVenueId);
    
    // Force a dining room selection if none matches the venue
    if (filteredDRs.length > 0 && !filteredDRs.find(d => d.id === state.activeDiningRoomId)) {
        state.activeDiningRoomId = filteredDRs[0].id;
    }

    filteredDRs.forEach(dr => {
        const isActive = dr.id === state.activeDiningRoomId ? 'active' : '';
        const html = `
            <div class="dr-item ${isActive}" onclick="switchDiningRoom('${dr.id}')">
                <ion-icon name="business-outline"></ion-icon>
                <span>${dr.name}</span>
                <div class="dr-item-actions">
                    <button class="icon-btn danger" onclick="event.stopPropagation(); deleteDiningRoom('${dr.id}')" title="Eliminar Comedor">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                </div>
            </div>
        `;
        drList.insertAdjacentHTML('beforeend', html);
    });

    // Version & Debug Tag in Sidebar
    const versionTag = `
        <div id="debug-status-panel"></div>
        <div style="margin-top:auto; padding: 20px 10px; font-size: 0.7rem; color: #94a3b8; border-top: 1px dashed #e2e8f0; opacity: 0.5;">Version v33-FORCED</div>
    `;

    if (drList) drList.insertAdjacentHTML('beforeend', versionTag);
}



window.switchDiningRoom = (id) => {
    console.log("Switching to dining room:", id);
    state.activeDiningRoomId = id;
    saveState();
    renderApp();
};


window.deleteDiningRoom = (id) => {
    if(state.diningRooms.length <= 1) {
        alert('Debe existir al menos un comedor.');
        return;
    }
    if(confirm('¿Eliminar este comedor de forma permanente? Las mesas se eliminarán y los residentes pasarán a la lista de "sin mesa".')) {
        // Move residents to unassigned if their table was here
        const tablesInDr = state.tables.filter(t => t.diningRoomId === id).map(t => t.id);
        state.residents.forEach(r => {
            if(tablesInDr.includes(r.tableId)) r.tableId = null;
        });
        
        state.tables = state.tables.filter(t => t.diningRoomId !== id);
        state.diningRooms = state.diningRooms.filter(d => d.id !== id);
        
        if (state.activeDiningRoomId === id) {
            state.activeDiningRoomId = state.diningRooms[0].id;
        }
        renderApp();
    }
}

// Generate Tables HTML (Filtered by active dining room)
function renderTables() {
    diningRoom.innerHTML = '';
    const activeTables = state.tables.filter(t => t.diningRoomId === state.activeDiningRoomId);
    
    activeTables.forEach(table => {
        const capacity = table.capacity || 4;
        const currentSeats = state.residents.filter(r => r.tableId === table.id).length;
        
        const w = table.width || (table.shape === 'horizontal' ? 200 : table.shape === 'vertical' ? 80 : 120);
        const h = table.height || (table.shape === 'horizontal' ? 80 : table.shape === 'vertical' ? 200 : 120);
        
        let seatsHtml = '';
        if (table.shape === 'vertical') {
            const leftCount = Math.ceil(capacity / 2);
            const rightCount = Math.floor(capacity / 2);
            let leftSlots = '', rightSlots = '';
            for(let i=0; i<leftCount; i++) leftSlots += `<div class="seat-slot" id="slot_${table.id}_${i}" ondrop="dropToSeat(event, '${table.id}', ${i})" ondragover="allowDrop(event)"></div>`;
            for(let i=leftCount; i<capacity; i++) rightSlots += `<div class="seat-slot" id="slot_${table.id}_${i}" ondrop="dropToSeat(event, '${table.id}', ${i})" ondragover="allowDrop(event)"></div>`;
            
            seatsHtml = `
                <div class="seats-vertical-container">
                    <div class="seats-col seats-left">${leftSlots}</div>
                    <div class="table-surface" style="width: ${w}px; height: ${h}px; ${table.shape === 'circle' ? 'border-radius: 50%;' : 'border-radius: 8px;'}"></div>
                    <div class="seats-col seats-right">${rightSlots}</div>
                </div>
            `;
        } else {
            const topCount = Math.ceil(capacity / 2);
            const bottomCount = Math.floor(capacity / 2);
            let topSlots = '', bottomSlots = '';
            for(let i=0; i<topCount; i++) topSlots += `<div class="seat-slot" id="slot_${table.id}_${i}" ondrop="dropToSeat(event, '${table.id}', ${i})" ondragover="allowDrop(event)"></div>`;
            for(let i=topCount; i<capacity; i++) bottomSlots += `<div class="seat-slot" id="slot_${table.id}_${i}" ondrop="dropToSeat(event, '${table.id}', ${i})" ondragover="allowDrop(event)"></div>`;
            
            seatsHtml = `
                <div class="seats-horizontal-container">
                    <div class="seats-row seats-top">${topSlots}</div>
                    <div class="table-surface" style="width: ${w}px; height: ${h}px; ${table.shape === 'circle' ? 'border-radius: 50%;' : 'border-radius: 8px;'}"></div>
                    <div class="seats-row seats-bottom">${bottomSlots}</div>
                </div>
            `;
        }
        
        const tableHtml = `
            <div class="table-container shape-${table.shape}" id="${table.id}" style="left: ${table.x}px; top: ${table.y}px;">
                <div class="table-layout" style="flex-direction: column;">
                    <div class="table-header">
                        <div class="table-header-title">
                            <ion-icon name="menu-outline"></ion-icon>
                            <h3>${table.name}</h3>
                            <span style="font-size: 0.85rem; opacity: 0.7; margin-left: 5px;">(${currentSeats}/${capacity})</span>
                        </div>
                        <div class="table-actions">
                            <button class="icon-btn" onclick="openEditTable('${table.id}')" title="Editar Mesa">
                                <ion-icon name="settings-outline"></ion-icon>
                            </button>
                            <button class="icon-btn danger" onclick="deleteTable('${table.id}')" title="Eliminar Mesa">
                                <ion-icon name="trash-outline"></ion-icon>
                            </button>
                        </div>
                    </div>
                    ${seatsHtml}
                </div>
            </div>
        `;
        diningRoom.insertAdjacentHTML('beforeend', tableHtml);
    });

    attachTableDragEvents();
}

function getThickenerHtml(thickener) {
    if (thickener === 'none') return '';
    const nameMap = { 'nectar': 'Néctar', 'miel': 'Miel', 'pudding': 'Pudding' };
    return `<div class="thickener-marker thickener-${thickener}" title="Espesante: ${nameMap[thickener]}">
                <ion-icon name="star"></ion-icon>
            </div>`;
}

// Generate Residents
function renderResidents() {
    unassignedList.innerHTML = '';

    // Fix up older data that has tableId but no seatIndex
    state.residents.forEach(r => {
        if (r.tableId && r.seatIndex == null) {
            const table = state.tables.find(t => t.id === r.tableId);
            const cap = table ? (table.capacity || 4) : 4;
            const used = state.residents.filter(other => other.tableId === r.tableId && other.seatIndex != null).map(other => other.seatIndex);
            for(let i=0; i<cap; i++) {
                if(!used.includes(i)) { r.seatIndex = i; break; }
            }
        }
    });

    state.residents.filter(r => r.venueId === state.activeVenueId).forEach(res => {
        const dietObj = state.diets.find(d => d.id === res.diet) || { color: '#ccc' };
        const supplementHtml = res.supplement ? `<div class="supplement-marker" title="Lleva Suplemento"><ion-icon name="medical-outline"></ion-icon></div>` : '';
        const assistanceHtml = res.assistance ? `<div class="assistance-marker" title="Requiere Asistencia"><ion-icon name="hand-right-outline"></ion-icon></div>` : '';

        const trHtml = `
            <div class="resident" 
                 id="${res.id}" 
                 draggable="true" 
                 ondragstart="drag(event)"
                 data-consistency="${res.consistency}"
                 style="border-left-color: ${dietObj.color};">
                <div class="resident-edit-area" onclick="openEditResident('${res.id}')"></div>
                <span class="res-name">${res.name}</span>
                ${getThickenerHtml(res.thickener)}
                ${supplementHtml}
                ${assistanceHtml}
                <button class="icon-btn danger" onclick="deleteResident('${res.id}')" style="z-index: 5;">
                    <ion-icon name="close-circle-outline"></ion-icon>
                </button>
            </div>
        `;

        // If assigned to a specific seat
        if (res.tableId && res.seatIndex != null) {
            const slot = document.getElementById(`slot_${res.tableId}_${res.seatIndex}`);
            if (slot) {
                slot.insertAdjacentHTML('beforeend', trHtml);
            } else {
                const tableRef = state.tables.find(t => t.id === res.tableId);
                if (!tableRef) {
                    res.tableId = null;
                    res.seatIndex = null;
                    unassignedList.insertAdjacentHTML('beforeend', trHtml);
                }
                // Si tableRef existe, la mesa pertenece a otro comedor inactivo.
                // No hacemos nada para no borrar su asignación.
            }
        } else {
            // Unassigned everywhere
            res.tableId = null;
            res.seatIndex = null;
            unassignedList.insertAdjacentHTML('beforeend', trHtml);
        }
    });
}

// -------------- DRAG & DROP FOR RESIDENTS --------------
window.allowDrop = (ev) => {
    ev.preventDefault();
    document.querySelectorAll('.seat-slot').forEach(el => el.classList.remove('drag-over'));
    unassignedList.classList.remove('drag-over');
    if (ev.currentTarget.classList.contains('seat-slot') || ev.currentTarget.id === 'unassigned-residents') {
        ev.currentTarget.classList.add('drag-over');
    }
};

window.drag = (ev) => {
    ev.dataTransfer.setData("text", ev.target.id);
    ev.dataTransfer.effectAllowed = "move";
};

window.dropToSeat = (ev, tableId, seatIndex) => {
    ev.preventDefault();
    ev.currentTarget.classList.remove('drag-over');
    const residentId = ev.dataTransfer.getData("text");
    if(!residentId) return;

    const existing = state.residents.find(r => r.tableId === tableId && r.seatIndex === seatIndex && r.id !== residentId);
    if(existing) {
        alert("Este asiento ya está ocupado.");
        return;
    }
    
    const resident = state.residents.find(r => r.id === residentId);
    if (resident) {
        resident.tableId = tableId;
        resident.seatIndex = seatIndex;
        renderApp();
    }
}

window.drop = (ev) => {
    ev.preventDefault();
    document.querySelectorAll('.seat-slot').forEach(el => el.classList.remove('drag-over'));
    unassignedList.classList.remove('drag-over');
    
    const residentId = ev.dataTransfer.getData("text");
    if(!residentId) return;
    
    const resident = state.residents.find(r => r.id === residentId);
    if (resident) {
        resident.tableId = null;
        resident.seatIndex = null;
        renderApp();
    }
};

document.addEventListener('dragend', () => {
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
});


// -------------- CUSTOM DRAG FOR TABLES --------------
let isDraggingTable = false;
let draggedTableObj = null;
let dragOffset = { x: 0, y: 0 };

function attachTableDragEvents() {
    document.querySelectorAll('.table-header').forEach(header => {
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.icon-btn')) return;
            
            isDraggingTable = true;
            const container = header.closest('.table-container');
            draggedTableObj = state.tables.find(t => t.id === container.id);
            
            const rect = container.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            
            container.classList.add('dragging');
        });
    });
}

document.addEventListener('mousemove', (e) => {
    if (isDraggingTable && draggedTableObj) {
        const canvasRect = diningRoom.getBoundingClientRect();
        let newX = e.clientX - canvasRect.left - dragOffset.x;
        let newY = e.clientY - canvasRect.top - dragOffset.y;
        
        newX = Math.max(0, Math.round(newX / 50) * 50);
        newY = Math.max(0, Math.round(newY / 50) * 50);
        
        draggedTableObj.x = newX;
        draggedTableObj.y = newY;
        
        const el = document.getElementById(draggedTableObj.id);
        if(el) {
            el.style.left = `${newX}px`;
            el.style.top = `${newY}px`;
        }
    }
});

document.addEventListener('mouseup', () => {
    if (isDraggingTable) {
        isDraggingTable = false;
        const el = document.getElementById(draggedTableObj.id);
        if(el) el.classList.remove('dragging');
        draggedTableObj = null;
        saveState();
    }
});


// -------------- MODALS AND ACTIONS --------------

// 1. DINING ROOMS
document.getElementById('add-dr-btn').addEventListener('click', () => {
    drForm.reset();
    document.getElementById('edit-dr-id').value = '';
    document.getElementById('dr-modal-title').textContent = "Añadir Comedor";
    drModal.classList.add('show');
});

document.getElementById('edit-current-dr-btn').addEventListener('click', () => {
    const dr = state.diningRooms.find(d => d.id === state.activeDiningRoomId);
    if(!dr) return;
    document.getElementById('edit-dr-id').value = dr.id;
    document.getElementById('dr-name').value = dr.name;
    document.getElementById('dr-modal-title').textContent = "Editar Nombre de Comedor";
    drModal.classList.add('show');
});

drForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-dr-id').value;
    const name = document.getElementById('dr-name').value;
    
    if (editId) {
        const dr = state.diningRooms.find(d => d.id === editId);
        dr.name = name;
    } else {
        const newId = 'dr_' + Date.now();
        state.diningRooms.push({ id: newId, name: name, venueId: state.activeVenueId });
        state.activeDiningRoomId = newId; // Auto select new
    }
    
    drModal.classList.remove('show');
    renderApp();
});


// 2. RESIDENTS
document.getElementById('add-resident-btn').addEventListener('click', () => {
    document.getElementById('edit-res-id').value = '';
    residentForm.reset();
    document.getElementById('resident-modal-title').textContent = "Nuevo Residente";
    residentModal.classList.add('show');
});

window.openEditResident = (id) => {
    const res = state.residents.find(r => r.id === id);
    if(!res) return;
    document.getElementById('edit-res-id').value = res.id;
    document.getElementById('res-name').value = res.name;
    document.getElementById('res-diet').value = res.diet;
    document.getElementById('res-consistency').value = res.consistency;
    document.getElementById('res-thickener').value = res.thickener;
    document.getElementById('res-supplement').checked = !!res.supplement;
    document.getElementById('res-assistance').checked = !!res.assistance;
    
    document.getElementById('resident-modal-title').textContent = "Editar Residente";
    residentModal.classList.add('show');
};

residentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-res-id').value;
    
    if (editId) {
        const res = state.residents.find(r => r.id === editId);
        res.name = document.getElementById('res-name').value;
        res.diet = document.getElementById('res-diet').value;
        res.consistency = document.getElementById('res-consistency').value;
        res.thickener = document.getElementById('res-thickener').value;
        res.supplement = document.getElementById('res-supplement').checked;
        res.assistance = document.getElementById('res-assistance').checked;
    } else {
        const newRes = {
            id: 'res_' + Date.now(),
            name: document.getElementById('res-name').value,
            diet: document.getElementById('res-diet').value,
            consistency: document.getElementById('res-consistency').value,
            thickener: document.getElementById('res-thickener').value,
            supplement: document.getElementById('res-supplement').checked,
            assistance: document.getElementById('res-assistance').checked,
            venueId: state.activeVenueId, // Auto-assign to current sede
            tableId: null,
            seatIndex: null
        };
        state.residents.push(newRes);
    }
    
    residentModal.classList.remove('show');
    renderApp();
});


// 3. TABLES
document.getElementById('add-table-btn').addEventListener('click', () => {
    if(state.diningRooms.length === 0) {
        alert("Debe crear un comedor primero.");
        return;
    }
    document.getElementById('edit-table-id').value = '';
    tableForm.reset();
    document.getElementById('table-modal-title').textContent = "Añadir Mesa al Plano";
    tableModal.classList.add('show');
});

window.openEditTable = (id) => {
    const table = state.tables.find(t => t.id === id);
    if(!table) return;
    document.getElementById('edit-table-id').value = table.id;
    document.getElementById('table-name').value = table.name;
    document.getElementById('table-shape').value = table.shape;
    document.getElementById('table-capacity').value = table.capacity || 4;
    document.getElementById('table-width').value = table.width || (table.shape === 'horizontal' ? 200 : table.shape === 'vertical' ? 80 : 120);
    document.getElementById('table-height').value = table.height || (table.shape === 'horizontal' ? 80 : table.shape === 'vertical' ? 200 : 120);
    
    document.getElementById('table-modal-title').textContent = "Editar Mesa";
    tableModal.classList.add('show');
};

tableForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-table-id').value;
    const name = document.getElementById('table-name').value;
    const shape = document.getElementById('table-shape').value;
    const capacity = parseInt(document.getElementById('table-capacity').value);
    const w = parseInt(document.getElementById('table-width').value);
    const h = parseInt(document.getElementById('table-height').value);
    
    if (editId) {
        const table = state.tables.find(t => t.id === editId);
        table.name = name;
        table.shape = shape;
        table.capacity = capacity;
        table.width = w;
        table.height = h;
    } else {
        state.tables.push({
            id: 'table_' + Date.now(),
            diningRoomId: state.activeDiningRoomId,
            name: name,
            shape: shape,
            capacity: capacity,
            width: w,
            height: h,
            x: 50, y: 50
        });
    }
    
    tableModal.classList.remove('show');
    renderApp();
});

window.duplicateTable = () => {
    const editId = document.getElementById('edit-table-id').value;
    const table = state.tables.find(t => t.id === editId);
    if (!table) {
        alert("Primero selecciona o guarda una mesa para duplicarla.");
        return;
    }

    const newTable = JSON.parse(JSON.stringify(table));
    newTable.id = 'table_' + Date.now();
    newTable.name = table.name + " (copia)";
    newTable.x += 20; // Offset for visibility
    newTable.y += 20;
    
    state.tables.push(newTable);
    saveState();
    tableModal.classList.remove('show');
    renderApp();
};

window.deleteTable = () => {
    const editId = document.getElementById('edit-table-id').value;
    if (editId && confirm("¿Eliminar esta mesa y desasignar a sus residentes?")) {
        state.tables = state.tables.filter(t => t.id !== editId);
        state.residents.forEach(r => {
            if (r.tableId === editId) {
                r.tableId = null;
                r.seatIndex = null;
            }
        });
        saveState();
        tableModal.classList.remove('show');
        renderApp();
    } else if (!editId) {
        tableModal.classList.remove('show');
    }
};


// Diet Form
const dietForm = document.getElementById('diet-form');
if (dietForm) {
    dietForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('diet-new-name').value;
        const color = document.getElementById('diet-new-color').value;
        const newId = 'diet_' + Date.now();
        
        state.diets.push({ id: newId, name: name, color: color });
        document.getElementById('diet-modal').classList.remove('show');
        dietForm.reset();
        renderApp();
        
        // Auto-select in resident form
        const select = document.getElementById('res-diet');
        if(select) select.value = newId;
    });
}


// Global deletes & close modals
window.deleteTable = (id) => {
    if(confirm('¿Eliminar mesa? Los residentes volverán a la lista lateral.')) {
        state.residents.forEach(res => { if(res.tableId === id) res.tableId = null; });
        state.tables = state.tables.filter(t => t.id !== id);
        renderApp();
    }
};

window.deleteDiet = (id) => {
    if(confirm('¿Eliminar esta dieta personalizada? Los residentes que la tengan pasarán a General (Basal).')) {
        state.diets = state.diets.filter(d => d.id !== id);
        state.residents.forEach(r => {
            if (r.diet === id) r.diet = 'basal';
        });
        saveState();
        renderApp();
    }
};

window.deleteResident = (id) => {
    if(confirm('¿Eliminar residente permanentemente?')) {
        state.residents = state.residents.filter(r => r.id !== id);
        renderApp();
    }
};

document.getElementById('close-modal').addEventListener('click', () => residentModal.classList.remove('show'));
document.getElementById('close-table-modal').addEventListener('click', () => tableModal.classList.remove('show'));
document.getElementById('close-dr-modal').addEventListener('click', () => drModal.classList.remove('show'));

// Close modals when clicking outside
window.addEventListener('click', (event) => {
    if (event.target == residentModal) residentModal.classList.remove('show');
    if (event.target == tableModal) tableModal.classList.remove('show');
    if (event.target == drModal) drModal.classList.remove('show');
    const recipeModal = document.getElementById('recipe-modal');
    if (recipeModal && event.target == recipeModal) recipeModal.classList.remove('show');
});


// -------------- KITCHEN MODULE LOGIC --------------

window.switchKitchenTab = (tab) => {
    document.querySelectorAll('.k-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.k-view').forEach(el => el.classList.remove('active'));
    
    document.querySelector(`.k-tab[onclick*="${tab}"]`).classList.add('active');
    document.getElementById('k-view-' + tab).classList.add('active');
    
    if(tab === 'recetario') {
         if(!document.getElementById('edit-dish-id').value) createNewDish();
    }
};

function variationHasContent(variation) {
    if (!variation) return false;
    const hasIngredients = variation.ingredients && (
        (typeof variation.ingredients === 'string' && variation.ingredients.trim().length > 0) ||
        (Array.isArray(variation.ingredients) && variation.ingredients.length > 0 && variation.ingredients.some(i => i.name && i.name.trim()))
    );
    const hasRecipe = variation.recipe && variation.recipe.trim().length > 0;
    return hasIngredients || hasRecipe;
}

function renderDishes() {
    const list = document.getElementById('dishes-list');
    if(!list) return;
    list.innerHTML = '';
    const activeId = document.getElementById('edit-dish-id') ? document.getElementById('edit-dish-id').value : '';
    
    state.dishes.forEach(dish => {
        // Migration to variations
        if (dish.ingredients !== undefined) {
             dish.variations = { 'default': { ingredients: dish.ingredients, recipe: dish.recipe, macros: dish.macros || {} } };
             delete dish.ingredients;
             delete dish.recipe;
             delete dish.macros;
        }

        const isActive = dish.id === activeId ? 'active' : '';
        const def = dish.variations && dish.variations['default'] ? dish.variations['default'] : { ingredients: '', macros: {} };

        // Helper to show summary text regardless of format (String or Array)
        let summary = 'Sin ingredientes detallados';
        if (def.ingredients) {
            if (typeof def.ingredients === 'string') {
                summary = def.ingredients;
            } else if (Array.isArray(def.ingredients)) {
                summary = def.ingredients.map(i => `${i.amount}${i.unit} ${i.name}`).join(', ');
            }
        }
        if (summary.length > 80) summary = summary.substring(0, 80) + '...';

        // Build diet variation badges
        let dietBadgesHtml = '';
        if (state.diets && dish.variations) {
            const badges = [];
            state.diets.forEach(diet => {
                const variation = dish.variations[diet.id];
                const hasDietContent = variationHasContent(variation);
                const abbrev = (diet.name.match(/\(([^)]+)\)/)?.[1] || diet.name.substring(0, 3)).toUpperCase();
                if (hasDietContent) {
                    badges.push(`<span class="dish-diet-badge filled" style="background:${diet.color};" title="${diet.name}: ✔ Completado">${abbrev}</span>`);
                } else {
                    badges.push(`<span class="dish-diet-badge empty" style="border-color:${diet.color}; color:${diet.color};" title="${diet.name}: ✘ Sin completar">${abbrev}</span>`);
                }
            });
            if (badges.length > 0) {
                dietBadgesHtml = `<div class="dish-diet-badges">${badges.join('')}</div>`;
            }
        }

        const html = `
            <div class="dish-card ${isActive}" onclick="selectDish('${dish.id}')">
                <div class="dish-title">${dish.name}</div>
                <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 10px; flex: 1;">
                   ${summary}
                </div>
                ${dietBadgesHtml}
                <div class="dish-macros">
                    <span title="Kcal">🔥 ${def.macros.kcal || 0}</span>
                    <span title="Carbohidratos">🍞 ${def.macros.carbs || 0}g</span>
                    <span title="Proteínas">🥩 ${def.macros.protein || 0}g</span>
                    <span title="Grasas">🥑 ${def.macros.fat || 0}g</span>
                </div>
            </div>
        `;
        list.insertAdjacentHTML('beforeend', html);
    });
}

// ------ Dish Variations Draft System ------
let currentDishDraft = {};
let activeDishTab = 'default';

function getEmptyVariation() {
    return { ingredients: [], recipe: '', macros: { kcal: 0, carbs: 0, protein: 0, fat: 0 } };
}

window.addIngredientRow = (nameStr = '', amountStr = '', unitStr = 'g') => {
    const list = document.getElementById('ingredients-list');
    
    let multiplier = 1;
    let showMult = false;
    const sel = document.getElementById('dish-calc-service');
    if(sel && sel.value) {
         multiplier = getMultiplierForService(sel.value);
         showMult = true;
    }
    
    let multDisplay = '';
    if (showMult && amountStr) {
         const am = parseFloat(amountStr);
         if (!isNaN(am)) {
             multDisplay = `<span style="width: 80px; font-weight:bold; color:var(--accent-blue); font-size: 0.85rem;" title="x${multiplier} (${activeDishTab === 'default' ? 'General' : activeDishTab})">➔ ${(am * multiplier).toFixed(1).replace(/\.0$/, '')}</span>`;
         }
    }

    const html = `
        <div class="ing-row" style="display:flex; gap:5px; align-items:center;">
             <input type="text" class="ing-name" placeholder="Ej. Merluza" style="flex:2; padding:0.5rem; border:1px solid #cbd5e1; border-radius:4px; font-family:inherit; font-size:0.9rem;" value="${nameStr}">
             <input type="number" class="ing-amount" placeholder="Cant." style="flex:1; padding:0.5rem; border:1px solid #cbd5e1; border-radius:4px; font-family:inherit; font-size:0.9rem;" value="${amountStr}">
             <input type="text" class="ing-unit" placeholder="Unid." style="flex:1; padding:0.5rem; border:1px solid #cbd5e1; border-radius:4px; font-family:inherit; font-size:0.9rem;" value="${unitStr}">
             ${multDisplay}
             <button type="button" class="btn danger" onclick="this.parentElement.remove()" style="padding: 0.5rem 0.8rem; font-weight:bold; cursor:pointer;" title="Eliminar">✕</button>
        </div>
    `;
    list.insertAdjacentHTML('beforeend', html);
};

window.saveTabToDraft = () => {
    if(!currentDishDraft[activeDishTab]) currentDishDraft[activeDishTab] = getEmptyVariation();
    
    const rows = document.querySelectorAll('#ingredients-list .ing-row');
    const arr = [];
    rows.forEach(r => {
         const n = r.querySelector('.ing-name').value.trim();
         if(n) {
             arr.push({
                 name: n,
                 amount: parseFloat(r.querySelector('.ing-amount').value) || 0,
                 unit: r.querySelector('.ing-unit').value.trim() || 'g'
             });
         }
    });

    const legacyTxt = document.getElementById('dish-ingredients-legacy').value.trim();
    if (arr.length === 0 && legacyTxt) {
        currentDishDraft[activeDishTab].ingredients = legacyTxt;
    } else {
        currentDishDraft[activeDishTab].ingredients = arr;
    }
    
    currentDishDraft[activeDishTab].recipe = document.getElementById('dish-prep').value;
    currentDishDraft[activeDishTab].macros = {
        kcal: parseFloat(document.getElementById('dish-kcal').value) || 0,
        carbs: parseFloat(document.getElementById('dish-carbs').value) || 0,
        protein: parseFloat(document.getElementById('dish-protein').value) || 0,
        fat: parseFloat(document.getElementById('dish-fat').value) || 0,
    };
};

window.switchVariationTab = (dietId) => {
    saveTabToDraft();
    activeDishTab = dietId;
    renderDishVariationTabs();
    populateVariationForm();
};

function renderDishVariationTabs() {
    const container = document.getElementById('dish-variation-tabs');
    if(!container) return;
    
    let html = `<button type="button" class="btn ${activeDishTab === 'default' ? 'primary' : 'secondary'}" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="switchVariationTab('default')">General (Basal)</button>`;
    
    state.diets.forEach(diet => {
        const isSet = currentDishDraft[diet.id] && (currentDishDraft[diet.id].ingredients || currentDishDraft[diet.id].recipe);
        const marker = isSet ? ' •' : '';
        const activeCls = activeDishTab === diet.id ? 'primary' : 'secondary';
        const colorStyle = activeDishTab === diet.id ? `background-color: ${diet.color}; color: white; border-color: ${diet.color};` : '';
        
        html += `<button type="button" class="btn ${activeCls}" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; ${colorStyle}" onclick="switchVariationTab('${diet.id}')">${diet.name}${marker}</button>`;
    });
    container.innerHTML = html;
    
    const label = document.getElementById('current-variation-label');
    if(label) {
        label.textContent = activeDishTab === 'default' ? 'General (Basal)' : state.diets.find(d => d.id === activeDishTab).name;
        label.style.color = activeDishTab === 'default' ? 'var(--accent-blue)' : state.diets.find(d => d.id === activeDishTab).color;
    }
}

function populateVariationForm() {
    const data = currentDishDraft[activeDishTab] || getEmptyVariation();
    
    const legacyArea = document.getElementById('dish-ingredients-legacy');
    const ingList = document.getElementById('ingredients-list');
    legacyArea.style.display = 'none';
    legacyArea.value = '';
    ingList.innerHTML = '';
    
    let ingData = data.ingredients || [];
    
    // Show/hide "Copy from" diet dropdown and button
    const copyContainer = document.getElementById('copy-diet-container');
    const copySelect = document.getElementById('copy-diet-select');
    if (copyContainer && copySelect) {
        if (activeDishTab !== 'default') {
            const dietsWithContent = Object.keys(currentDishDraft).filter(k => k !== activeDishTab && variationHasContent(currentDishDraft[k]));
            if (dietsWithContent.length > 0) {
                copyContainer.style.display = 'inline-flex';
                copySelect.innerHTML = '';
                if (dietsWithContent.includes('default')) {
                    copySelect.innerHTML += `<option value="default">General</option>`;
                }
                dietsWithContent.filter(k => k !== 'default').forEach(k => {
                    const dName = state.diets.find(d => d.id === k)?.name || k;
                    copySelect.innerHTML += `<option value="${k}">${dName}</option>`;
                });
            } else {
                copyContainer.style.display = 'none';
            }
        } else {
            copyContainer.style.display = 'none';
        }
    }
    
    if (typeof ingData === 'string') {
        legacyArea.style.display = 'block';
        legacyArea.value = ingData;
    } else if (Array.isArray(ingData)) {
        ingData.forEach(i => addIngredientRow(i.name, i.amount, i.unit));
    }
    
    // Add 1 empty row if no rows and not showing legacy string
    if (ingList.children.length === 0 && legacyArea.style.display === 'none') {
        addIngredientRow();
    }
    
    document.getElementById('dish-prep').value = data.recipe || '';
    
    document.getElementById('dish-kcal').value = data.macros?.kcal || '';
    document.getElementById('dish-carbs').value = data.macros?.carbs || '';
    document.getElementById('dish-protein').value = data.macros?.protein || '';
    document.getElementById('dish-fat').value = data.macros?.fat || '';
}

window.createNewDish = () => {
    document.getElementById('dish-form').reset();
    document.getElementById('edit-dish-id').value = '';
    document.getElementById('dish-form-title').textContent = "Nuevo Plato";
    document.getElementById('delete-dish-btn').style.display = 'none';
    
    // Hide merge section for new dishes
    const mergeSection = document.getElementById('merge-section');
    if (mergeSection) mergeSection.style.display = 'none';
    
    currentDishDraft = { 'default': getEmptyVariation() };
    activeDishTab = 'default';
    renderDishVariationTabs();
    populateServiceDropdown();
    populateVariationForm();
    
    renderDishes();
};

window.selectDish = (id) => {
    const dish = state.dishes.find(d => d.id === id);
    if(!dish) return;
    
    document.getElementById('edit-dish-id').value = dish.id;
    document.getElementById('dish-name').value = dish.name;
    
    // Clone variations to draft
    currentDishDraft = JSON.parse(JSON.stringify(dish.variations || { 'default': getEmptyVariation() }));
    activeDishTab = 'default';
    
    document.getElementById('dish-form-title').textContent = "Editar Plato";
    document.getElementById('delete-dish-btn').style.display = 'block';
    
    // Show merge section and populate dropdown
    const mergeSection = document.getElementById('merge-section');
    const mergeSelect = document.getElementById('merge-source-select');
    if (mergeSection && mergeSelect) {
        mergeSection.style.display = 'block';
        mergeSelect.innerHTML = '<option value="">\u2014 Seleccionar plato a fusionar \u2014</option>';
        state.dishes.forEach(d => {
            if (d.id !== id) {
                mergeSelect.innerHTML += `<option value="${d.id}">${d.name}</option>`;
            }
        });
    }
    
    renderDishVariationTabs();
    populateServiceDropdown();
    populateVariationForm();
};

// -------------- COPY FROM BASAL / MERGE FEATURES --------------

/**
 * Copy the default/General variation into the currently active diet tab.
 * Deep-clones ingredients, recipe, and macros so the user can modify.
 */
window.copyFromSelectedDiet = () => {
    const sourceTab = document.getElementById('copy-diet-select')?.value;
    if (!sourceTab) return;
    
    const sourceData = currentDishDraft[sourceTab];
    if (!sourceData) {
        alert('No hay receta para copiar en la dieta seleccionada.');
        return;
    }
    
    // Deep clone source into the active tab
    currentDishDraft[activeDishTab] = JSON.parse(JSON.stringify(sourceData));
    
    // Re-render the form with the copied data
    populateVariationForm();
    renderDishVariationTabs();
    
    // Brief visual feedback
    const copyBtn = document.getElementById('copy-diet-btn');
    if (copyBtn) {
        copyBtn.style.background = '#10b981';
        copyBtn.style.color = 'white';
        setTimeout(() => {
            copyBtn.style.background = '';
            copyBtn.style.color = '#10b981';
        }, 1500);
    }
};

/**
 * Merge another dish's variations into the currently selected dish.
 */
window.executeMerge = () => {

    const mergeSelect = document.getElementById('merge-source-select');

    const sourceId = mergeSelect?.value;
    if (!sourceId) {
        alert('Selecciona un plato de origen para fusionar.');
        return;
    }
    
    const currentDishId = document.getElementById('edit-dish-id').value;
    if (!currentDishId) {
        alert('Primero selecciona y guarda un plato antes de fusionar.');
        return;
    }

    if (sourceId === currentDishId) {
        alert('No puedes fusionar un plato con sí mismo.');
        return;
    }
    
    const sourceDish = state.dishes.find(d => d.id === sourceId);
    const targetDish = state.dishes.find(d => d.id === currentDishId);
    if (!sourceDish || !targetDish) {
        alert('Error al encontrar los platos para la fusión.');
        return;
    }
    
    // 1. Ensure current form state is in draft
    saveTabToDraft();
    
    let imported = 0;
    let skipped = 0;
    const details = [];
    
    // 2. Smart Mapping: Handle dishes that are separate by consistency
    const sourceDefault = sourceDish.variations['default'];
    if (variationHasContent(sourceDefault)) {
        const targetDefault = currentDishDraft['default'];
        if (variationHasContent(targetDefault)) {
            const sourceNameLower = sourceDish.name.toLowerCase();
            let smartDietKey = null;
            for (const diet of state.diets) {
                const dietNameLower = diet.name.toLowerCase();
                if (sourceNameLower.includes(dietNameLower) || (diet.id.length > 2 && sourceNameLower.includes(diet.id.toLowerCase()))) {
                    smartDietKey = diet.id;
                    break;
                }
            }
            if (smartDietKey && !variationHasContent(currentDishDraft[smartDietKey])) {
                currentDishDraft[smartDietKey] = JSON.parse(JSON.stringify(sourceDefault));
                imported++;
                const dietName = state.diets.find(d => d.id === smartDietKey).name;
                details.push(`\u2713 Mapeado "${sourceDish.name}" -> Pestaña "${dietName}"`);
                sourceDish.variations._smartMapped = true; 
            }
        }
    }

    // 3. General mapping
    Object.keys(sourceDish.variations).forEach(varKey => {
        if (varKey === '_smartMapped') return;
        const sourceVar = sourceDish.variations[varKey];
        if (variationHasContent(sourceVar) && !variationHasContent(currentDishDraft[varKey])) {
            currentDishDraft[varKey] = JSON.parse(JSON.stringify(sourceVar));
            imported++;
            const dietName = varKey === 'default' ? 'General' : (state.diets.find(d => d.id === varKey)?.name || varKey);
            details.push(`\u2713 Copiada pestaña "${dietName}"`);
        } else if (variationHasContent(sourceVar)) {
            if (varKey === 'default' && sourceDish.variations._smartMapped) return;
            skipped++;
            const dietName = varKey === 'default' ? 'General' : (state.diets.find(d => d.id === varKey)?.name || varKey);
            details.push(`\u2717 Omitida "${dietName}" (el destino ya tiene datos)`);
        }
    });
    delete sourceDish.variations._smartMapped;
    
    if (imported === 0) {
        alert('No se pudo importar nada. El destino ya tiene todas las pestañas que el origen ofrece.');
        return;
    }

    // --- CRITICAL PERSISTENCE FIX ---
    // Update the actual object in the state dishes array immediately
    targetDish.variations = JSON.parse(JSON.stringify(currentDishDraft));
    
    // Update UI
    renderDishVariationTabs();
    populateVariationForm();
    
    const msg = `FUSIÓN EXITOSA:\n\n${details.join('\n')}\n\n¿Desea ELIMINAR el plato original "${sourceDish.name}"?`;
    if (confirm(msg)) {
        // Update menu references
        if (state.menuCycles) {
            Object.values(state.menuCycles).forEach(week => {
                Object.values(week).forEach(day => {
                    Object.keys(day).forEach(diet => {
                        const slot = day[diet];
                        if (slot) {
                            Object.keys(slot).forEach(svc => {
                                if (slot[svc] === sourceId) slot[svc] = currentDishId;
                            });
                        }
                    });
                });
            });
        }
        state.dishes = state.dishes.filter(d => d.id !== sourceId);
    }
    
    saveState();
    renderDishes();
    alert('Plato actualizado y guardado correctamente.');
};


const dishFormUI = document.getElementById('dish-form');
if (dishFormUI) {
    dishFormUI.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTabToDraft(); // grab the latest from current tab
        
        const editId = document.getElementById('edit-dish-id').value;
        const newObj = {
            name: document.getElementById('dish-name').value,
            variations: JSON.parse(JSON.stringify(currentDishDraft))
        };
        
        if (editId) {
            const dish = state.dishes.find(d => d.id === editId);
            Object.assign(dish, newObj);
        } else {
            newObj.id = 'dish_' + Date.now();
            state.dishes.push(newObj);
            document.getElementById('edit-dish-id').value = newObj.id;
            document.getElementById('delete-dish-btn').style.display = 'block';
            document.getElementById('dish-form-title').textContent = "Editar Plato";
        }
        
        saveState();
        renderDishVariationTabs(); // Update markers
        renderDishes();
    });
}

window.deleteCurrentDish = () => {
    const id = document.getElementById('edit-dish-id').value;
    if(id && confirm("¿Eliminar este plato del recetario?")) {
        state.dishes = state.dishes.filter(d => d.id !== id);
        saveState();
        createNewDish();
    }
};

// ------ Estimacion Draft System ------
const estDays = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const estServices = ['desayuno', 'm_manana', 'almuerzo', 'merienda', 'cena'];
const staffKeys = ['gerocultores', 'limpieza', 'cocina', 'recepcion', 'actividades'];

window.initEstimaciones = function() {
    if(!state.estimaciones) state.estimaciones = {};
    estDays.forEach(d => {
        estServices.forEach(s => {
            const key = `${d}_${s}`;
            if(!state.estimaciones[key]) state.estimaciones[key] = {};
            staffKeys.forEach(k => { if(state.estimaciones[key][k] === undefined) state.estimaciones[key][k] = 0; });
            state.diets.forEach(diet => {
                if(state.estimaciones[key]['extra_'+diet.id] === undefined) state.estimaciones[key]['extra_'+diet.id] = 0;
            });
        });
    });
};


window.renderEstimacionTable = function() {
    const thead = document.getElementById('estimacion-thead');
    const tbody = document.getElementById('estimacion-tbody');
    if(!thead || !tbody) return;

    let cols = `<tr>
        <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: left;">Día</th>
        <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: left;">Servicio</th>
        <th title="Gerocultores" style="width:50px;">Geroc.</th>
        <th style="width:50px;">Limp.</th>
        <th style="width:50px;">Cocina</th>
        <th style="width:50px;">Recep.</th>
        <th style="width:50px;">Activ.</th>`;

    state.diets.forEach(d => cols += `<th title="${d.name}" style="border-left: 2px solid ${d.color}; font-size:0.8rem;">${(d.name.match(/\((.*?)\)/)?.[1] || d.name.substring(0,3)).toUpperCase()}</th>`);
    cols += `<th style="border-left: 2px solid #1e293b; background: #e2e8f0; font-weight: bold;">Total</th></tr>`;
    thead.innerHTML = cols;

    const baseDiets = {}; 
    state.diets.forEach(d => baseDiets[d.id] = 0); 
    state.residents.forEach(r => { if(r.venueId === state.activeVenueId && r.tableId && baseDiets[r.diet]!==undefined) baseDiets[r.diet]++; });

    let rows = '';
    estDays.forEach(day => {
        estServices.forEach((srv, i) => {
           const key = `${day}_${srv}`;
           const est = (state.estimaciones && state.estimaciones[key]) ? state.estimaciones[key] : {};
           rows += `<tr style="background: ${i%2===0?'#fff':'#f8fafc'}; transition: background 0.2s;">`;
           
           if(i === 0) rows += `<td rowspan="5" style="border: 1px solid var(--border-color); text-align: left; padding: 10px; vertical-align: middle; font-weight: bold; text-transform: capitalize; background: white;">${day}</td>`;
           const srvName = srv.replace('_', ' ');
           
           rows += `<td style="text-align: left; padding: 5px; text-transform: capitalize; border-bottom:${i===4 ? '2px solid var(--border-color)' : '1px solid #e2e8f0'}; border-right: 1px solid #e2e8f0;">${srvName}</td>`;
           
           staffKeys.forEach(k => {
               rows += `<td style="border-bottom:${i===4 ? '2px solid var(--border-color)' : '1px solid #e2e8f0'}; border-right: 1px solid #f1f5f9; text-align: center;">
                  <input type="number" min="0" value="${est[k]||0}" onchange="updateEst('${key}', '${k}', this.value)" style="width:40px; padding:2px; text-align:center; border:1px solid #cbd5e1; border-radius:3px;">
               </td>`;
           });
           
           let lineTotal = 0;
           state.diets.forEach(d => {
               const autoCount = baseDiets[d.id] || 0;
               const extraCount = est['extra_'+d.id] || 0;
               const staffSum = (d.id === 'colaboradores') ? staffKeys.reduce((acc, k) => acc + (parseInt(est[k])||0), 0) : 0;
               const finalCell = autoCount + extraCount + staffSum; 
               lineTotal += finalCell;
               
               rows += `<td style="border-bottom:${i===4 ? '2px solid var(--border-color)' : '1px solid #e2e8f0'}; border-left: 2px solid ${d.color}40; padding: 5px;">
                  <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                     <span style="font-weight:700; font-size:1.05rem; color: #1e293b;">${finalCell}</span>
                     ${d.id === 'colaboradores' ? `<span style="font-size:0.6rem; color:#64748b;">(+) extra</span>` : ''}
                     <input type="number" value="${extraCount}" title="Extra manual" onchange="updateEst('${key}', 'extra_${d.id}', this.value)" style="width:35px; padding:2px; text-align:center; border:1px dashed #94a3b8; font-size:0.75rem; border-radius:3px; color:#475569;">
                  </div>
               </td>`;
           });
           
           rows += `<td style="border-bottom:${i===4 ? '2px solid var(--border-color)' : '1px solid #e2e8f0'}; border-left: 2px solid #1e293b; background: #f1f5f9; font-weight:bold; font-size:1.15rem; color: var(--accent-blue);">${lineTotal}</td>`;
           rows += `</tr>`;
        });
    });
    tbody.innerHTML = rows;
};

window.updateEst = (key, field, val) => {
    if(!state.estimaciones) window.initEstimaciones();
    state.estimaciones[key][field] = parseInt(val)||0;
    saveState();
    window.renderEstimacionTable();
    if(document.getElementById('dish-calc-service')?.value === key) {
         populateVariationForm();
    }
};

window.populateServiceDropdown = () => {
    const sel = document.getElementById('dish-calc-service');
    if(!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">Porciones para 1 persona (Base)</option>';
    estDays.forEach(d => {
        estServices.forEach(s => {
            const key = `${d}_${s}`;
            sel.innerHTML += `<option value="${key}">${d.toUpperCase()} - ${s.toUpperCase().replace('_',' ')}</option>`;
        });
    });
    sel.value = currentVal;
};

// initEstimaciones defined above


window.getMultiplierForService = (key) => {
    if(!state.estimaciones) window.initEstimaciones();
    const est = state.estimaciones[key] || {};
    
    const baseDiets = {}; 
    state.diets.forEach(d => baseDiets[d.id] = 0); 
    state.residents.forEach(r => { if(r.venueId === state.activeVenueId && r.tableId && baseDiets[r.diet]!==undefined) baseDiets[r.diet]++; });

    const finalCounts = {};
    state.diets.forEach(d => {
        const autoCount = baseDiets[d.id] || 0;
        const extraCount = est['extra_'+d.id] || 0;
        const staffSum = (d.id === 'colaboradores') ? staffKeys.reduce((acc, k) => acc + (parseInt(est[k])||0), 0) : 0;
        finalCounts[d.id] = autoCount + extraCount + staffSum;
    });

    if(activeDishTab && activeDishTab !== 'default') {
        return finalCounts[activeDishTab] || 0;
    } else {
        let sum = 0;
        state.diets.forEach(d => {
            const currentVar = currentDishDraft ? currentDishDraft[d.id] : null;
            const hasVar = currentVar && ((currentVar.ingredients && currentVar.ingredients.length > 0) || currentVar.recipe);
            if(!hasVar) {
                sum += finalCounts[d.id] || 0;
            }
        });
        return sum || 1; 
    }
};

// Run
document.addEventListener('DOMContentLoaded', () => {
    // Make sure menuCycles exists
    if(!state.menuCycles) state.menuCycles = {};

    renderApp();
    // Default mock data for kitchen if empty, for demo purposes
    if (state.dishes.length === 0) {
        state.dishes.push({
            id: 'dish_demo1', name: 'Merluza al Horno con Patatas',
            variations: {
                 'default': {
                      ingredients: [
                          { name: 'Merluza', amount: 150, unit: 'g' },
                          { name: 'Patatas', amount: 100, unit: 'g' },
                          { name: 'Aceite de oliva', amount: 5, unit: 'ml' }
                      ],
                      recipe: '1. Pelar y cortar patatas.\n2. Hornear patatas 15min.\n3. Añadir merluza y hornear 10min más.',
                      macros: { kcal: 350, carbs: 20, protein: 40, fat: 12 }
                 }
            }
        });
        saveState();
        renderDishes();
    }
    createNewDish(); // Initialize form state
});

// -------------- NUTRITIONAL DATABASE (per 100g/unit) --------------
const nutritionalDB = {
    'pollo': { kcal: 165, carbs: 0, protein: 31, fat: 4 },
    'carne': { kcal: 250, carbs: 0, protein: 26, fat: 15 },
    'pescado': { kcal: 120, carbs: 0, protein: 22, fat: 3 },
    'peceto': { kcal: 200, carbs: 0, protein: 28, fat: 8 },
    'merluza': { kcal: 90, carbs: 0, protein: 18, fat: 2 },
    'arroz': { kcal: 360, carbs: 78, protein: 7, fat: 1 },
    'fideo': { kcal: 350, carbs: 72, protein: 12, fat: 2 },
    'spaghetti': { kcal: 350, carbs: 72, protein: 12, fat: 2 },
    'tallarin': { kcal: 350, carbs: 72, protein: 12, fat: 2 },
    'maíz': { kcal: 360, carbs: 77, protein: 8, fat: 4 },
    'maiz': { kcal: 360, carbs: 77, protein: 8, fat: 4 },
    'harina': { kcal: 360, carbs: 76, protein: 10, fat: 1 },
    'papa': { kcal: 77, carbs: 17, protein: 2, fat: 0 },
    'batata': { kcal: 86, carbs: 20, protein: 1.6, fat: 0 },
    'zapallo': { kcal: 26, carbs: 6, protein: 1, fat: 0.1 },
    'huevo': { kcal: 155, carbs: 1.1, protein: 13, fat: 11 }, // per 100g, avg unit is 50g
    'queso': { kcal: 350, carbs: 3, protein: 25, fat: 26 },
    'leche': { kcal: 42, carbs: 5, protein: 3.4, fat: 1 },
    'aceite': { kcal: 884, carbs: 0, protein: 0, fat: 100 },
    'crema': { kcal: 340, carbs: 3, protein: 2, fat: 35 },
    'pan': { kcal: 265, carbs: 49, protein: 9, fat: 3 },
    'galleta': { kcal: 380, carbs: 70, protein: 10, fat: 6 },
    'fruta': { kcal: 50, carbs: 12, protein: 0.5, fat: 0 },
    'verdura': { kcal: 25, carbs: 5, protein: 1, fat: 0 },
    'ensalada': { kcal: 30, carbs: 6, protein: 1, fat: 0 }
};

function calculateIngredientsMacros(ingredients) {
    const totals = { kcal: 0, carbs: 0, protein: 0, fat: 0 };
    if (!Array.isArray(ingredients)) return totals;

    ingredients.forEach(ing => {
        const name = ing.name.toLowerCase();
        let findKey = Object.keys(nutritionalDB).find(k => name.includes(k));
        
        if (findKey) {
            const data = nutritionalDB[findKey];
            const amount = parseFloat(ing.amount) || 0;
            const factor = amount / 100; // Database is per 100g
            
            totals.kcal += Math.round(data.kcal * factor);
            totals.carbs += parseFloat((data.carbs * factor).toFixed(1));
            totals.protein += parseFloat((data.protein * factor).toFixed(1));
            totals.fat += parseFloat((data.fat * factor).toFixed(1));
        }
    });
    
    // Clean up floats
    totals.carbs = parseFloat(totals.carbs.toFixed(1));
    totals.protein = parseFloat(totals.protein.toFixed(1));
    totals.fat = parseFloat(totals.fat.toFixed(1));
    
    return totals;
}

// -------------- CSV IMPORT LOGIC --------------

window.handleCSVImport = (input) => {
    console.log("CSV Import started...");
    const file = input.files[0];
    if (!file) {
        console.warn("No file selected.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target.result;
            console.log("File read successfully, length:", text.length);
            processPlanningCSV(text);
        } catch (err) {
            console.error("Error in handleCSVImport onload:", err);
            alert("Error al leer el archivo: " + err.message);
        }
        input.value = ''; // Reset for next time
    };
    reader.onerror = (err) => {
        console.error("FileReader error:", err);
        alert("Error al cargar el archivo.");
    };
    reader.readAsText(file);
};

function processPlanningCSV(csv) {
    console.log("Processing CSV content...");
    const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
        console.warn("CSV has fewer than 2 lines.");
        alert("El archivo está vacío o no tiene el formato correcto.");
        return;
    }

    try {
        // Detect separator (usually ; or ,)
        const header = lines[0];
        console.log("Header detected:", header);
        const sep = header.includes(';') ? ';' : ',';

        // Improved CSV line parser to handle quotes
        const parseCSVLine = (text, separator) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            if (!text) return [];
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === separator && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result.map(v => v.replace(/^"|"$/g, '').trim());
        };

        const rows = lines.slice(1).map(line => parseCSVLine(line, sep));
        console.log("Total rows (excluding header):", rows.length);

        if (!state.menuCycles) state.menuCycles = {};

        let importedCount = 0;
        const newIngredients = new Set();
        const currentWeek = document.getElementById('week-selector')?.value || '1';
    
    // Day/Service mapping
    const dayMap = {
        'lunes': 'mon', 'martes': 'tue', 'miercoles': 'wed', 'miércoles': 'wed',
        'jueves': 'thu', 'viernes': 'fri', 'sabado': 'sat', 'sábado': 'sat', 'domingo': 'sun'
    };

    const dietMap = {
        'basal': 'basal', 'col': 'colaboradores', 'bla': 'blanda', 'sgl': 'sin_gluten',
        'sic': 'sic', 'dia': 'diabetica', 'liq': 'liquida', 'tra': 'triturada', 'veg': 'vegetariana'
    };

    if (!state.menuCycles[currentWeek]) state.menuCycles[currentWeek] = {};

    let totalProteinaKg = 0;
    const isProtein = (name) => {
        const lower = name.toLowerCase();
        return lower.includes('carne') || lower.includes('pollo') || lower.includes('pescado') || 
               lower.includes('huevo') || lower.includes('merluza') || lower.includes('peceto') || 
               lower.includes('pechuga') || lower.includes('muslo') || lower.includes('bife');
    };

    const normalizeIng = (name) => {
        let n = name.trim();
        const lower = n.toLowerCase();
        if (lower === 'muslo') return "Pollo Muslo";
        if (lower === 'pechuga') return "Pollo Pechuga";
        if (lower.includes('pollo') && !lower.includes('pollo muslo') && !lower.includes('pollo pechuga') && lower.includes('muslo')) return "Pollo Muslo";
        return n;
    };

    const shoppingList = {};

    rows.forEach((row, rowIndex) => {
        if (row.length < 4) {
            console.warn(`Row ${rowIndex + 1} skipped: insufficient columns`, row);
            return;
        }
        let [dia_servicio, dieta_tipo, plato_nombre, ingredientes_detalle] = row;
        
        // --- PARSE DAY AND SERVICE --- 
        // Handles "LuA", "MaC", etc.
        const codeMap = { 'lu': 'lunes', 'ma': 'martes', 'mi': 'miércoles', 'ju': 'jueves', 'vi': 'viernes', 'sa': 'sábado', 'do': 'domingo' };
        let dayId = null;
        let service = 'lunch';

        const code = dia_servicio.toLowerCase().trim();
        if (code.length >= 2) {
            const dayKey = code.substring(0, 2);
            const turnKey = code.substring(2, 3);
            const dayName = codeMap[dayKey];
            dayId = dayMap[dayName];
            if (turnKey === 'c') service = 'dinner';
        }

        // Fallback to old parser if LuA fails
        if (!dayId) {
            const normalizedDia = dia_servicio.toLowerCase().replace('_', ' ');
            for (const key in dayMap) {
                if (normalizedDia.includes(key)) {
                    dayId = dayMap[key];
                    break;
                }
            }
            service = normalizedDia.includes('cena') ? 'dinner' : 'lunch';
        }

        if (!dayId) {
            console.warn(`Row ${rowIndex + 1} skipped: invalid day code '${dia_servicio}'`);
            return;
        }

        // --- PARSE INGREDIENTS ---
        // Handles "|" and ":" if present, otherwise falls back to "," system
        let parsedIngs = [];
        if (ingredientes_detalle.includes('|')) {
            const parts = ingredientes_detalle.split('|');
            parts.forEach(p => {
                 const clean = p.trim();
                 if(!clean) return;
                 const splitColon = clean.split(':');
                 const name = normalizeIng(splitColon[0]);
                 const rest = splitColon[1] ? splitColon[1].trim() : '';
                 const match = rest.match(/([\d\.,]+)\s*([a-zA-Z]+)/);
                 if (match) {
                     parsedIngs.push({ name, amount: parseFloat(match[1].replace(',', '.')), unit: match[2] });
                 } else {
                     parsedIngs.push({ name, amount: 0, unit: 'u' });
                 }
            });
        } else {
            parsedIngs = parseIngredientsCSV(ingredientes_detalle);
        }

        // --- BUSINESS RULES ---
        const dietKey = dieta_tipo.toLowerCase();
        const targetDietId = dietMap[dietKey] || 'basal';

        // Filter Alcohol rule (Vino tinto in SIC/Liq)
        if (['sic', 'liq'].includes(dietKey)) {
             const hasAlcohol = ingredientes_detalle.toLowerCase().includes('vino') || ingredientes_detalle.toLowerCase().includes('alcohol');
             const evaporates = ingredientes_detalle.toLowerCase().includes('evapora');
             if (hasAlcohol && !evaporates) {
                 parsedIngs = parsedIngs.filter(i => !i.name.toLowerCase().includes('vino') && !i.name.toLowerCase().includes('alcohol'));
             }
        }

        // Tra: Labeling
        let finalPlatoName = plato_nombre;
        if (dietKey === 'tra') finalPlatoName = `Textura Modificada (Disfagia) - ${plato_nombre}`;

        // --- CALCULATE INVENTORY TOTALS ---
        // Get number of residents for this diet in the CURRENT VENUE
        const residentsOnDiet = state.residents.filter(r => r.diet === targetDietId && r.venueId === state.activeVenueId && r.tableId).length;
        
        parsedIngs.forEach(ing => {
            const totalAmount = ing.amount * residentsOnDiet;
            if (!shoppingList[ing.name]) shoppingList[ing.name] = { total: 0, unit: ing.unit };
            shoppingList[ing.name].total += totalAmount;

            if (isProtein(ing.name)) {
                let kgVal = totalAmount;
                if (ing.unit.toLowerCase() === 'g') kgVal = totalAmount / 1000;
                totalProteinaKg += kgVal;
            }
        });

        // --- UPDATE APP STATE ---
        let dish = state.dishes.find(d => d.name === finalPlatoName);
        if (!dish) {
            dish = { id: 'dish_' + Date.now() + '_' + importedCount, name: finalPlatoName, variations: { 'default': getEmptyVariation() } };
            state.dishes.push(dish);
        }
        dish.variations[targetDietId] = {
            ingredients: parsedIngs,
            recipe: ingredientes_detalle,
            macros: calculateIngredientsMacros(parsedIngs)
        };

        if (!state.menuCycles[currentWeek][dayId]) state.menuCycles[currentWeek][dayId] = {};
        if (!state.menuCycles[currentWeek][dayId][targetDietId]) state.menuCycles[currentWeek][dayId][targetDietId] = {};
        state.menuCycles[currentWeek][dayId][targetDietId][service] = dish.id;

        importedCount++;
    });

    saveState();
    renderApp();
    renderMenuMatrix();
    renderShoppingList(shoppingList, totalProteinaKg, importedCount);
    renderEstimacionTable();
    
    } catch (err) {
        console.error("Error in processPlanningCSV:", err);
        alert("Error al procesar el CSV: " + err.message);
    }
}

/**
 * Generates the shopping list based on the current planner (state.menuCycles)
 * and the current ESTIMATED diners (residents + staff/extras).
 */
window.generateShoppingListFromMenu = () => {
    const week = document.getElementById('week-selector')?.value || '1';
    if (!state.menuCycles || !state.menuCycles[week]) {
        alert('No hay una planificación cargada para la semana ' + week);
        return;
    }

    const weekData = state.menuCycles[week];
    const shoppingList = {};
    let dishCount = 0;

    // 1. Get base resident counts per diet
    const baseDiets = {};
    state.diets.forEach(d => baseDiets[d.id] = 0);
    state.residents.forEach(r => {
        if (r.venueId === state.activeVenueId && r.tableId && baseDiets[r.diet] !== undefined) {
             baseDiets[r.diet]++;
        }
    });

    const estDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const estServices = ['almuerzo', 'cena'];
    const staffKeys = ['geroc', 'limp', 'cocina', 'recep', 'activ'];

    // 2. Iterate through the menu
    Object.keys(weekData).forEach(day => {
        const dayDiets = weekData[day];
        Object.keys(dayDiets).forEach(dietId => {
            const dietServices = dayDiets[dietId];
            Object.keys(dietServices).forEach(svcKey => {
                const dishId = dietServices[svcKey];
                if (!dishId) return;

                const dish = state.dishes.find(d => d.id === dishId);
                if (!dish) return;

                // Determine diner count for this specific day/service/diet
                const dayKey = day.toLowerCase(); // Normalized day key
                const svcName = svcKey.toLowerCase();
                const key = `${dayKey}_${svcName}`;
                const est = (state.estimaciones && state.estimaciones[key]) ? state.estimaciones[key] : {};

                let diners = baseDiets[dietId] || 0;
                diners += parseInt(est['extra_' + dietId]) || 0;

                // If diet is "colaboradores", add all staff
                if (dietId === 'colaboradores') {
                     staffKeys.forEach(k => diners += (parseInt(est[k]) || 0));
                }

                if (diners <= 0) return;
                dishCount++;

                // Get ingredients for this variation or fallback to default
                const variation = dish.variations?.[dietId] || dish.variations?.['default'] || {};
                const ings = variation.ingredients || [];

                if (Array.isArray(ings)) {
                    ings.forEach(ing => {
                        const name = ing.name.trim();
                        const amount = parseFloat(ing.amount) || 0;
                        const unit = ing.unit || 'un';

                        if (!shoppingList[name]) {
                            shoppingList[name] = { total: 0, unit: unit };
                        }
                        shoppingList[name].total += (amount * diners);
                    });
                }
            });
        });
    });

    if (dishCount === 0) {
        alert('No se encontraron platos asignados en el planificador para la semana ' + week);
        return;
    }

    renderShoppingList(shoppingList, 0, dishCount);
};


function renderShoppingList(list, proteinTotal, count) {
    const summary = document.getElementById('shopping-summary');
    const tbody = document.getElementById('shopping-tbody');
    if(!summary || !tbody) return;

    let summaryHtml = `<p><strong>Análisis de ${count} servicios planificados.</strong></p>`;
    if (proteinTotal > 0) {
        summaryHtml += `<p>Se requieren <strong>${proteinTotal.toFixed(2)} kg</strong> de proteína total para la semana según los comensales actuales.</p>`;
    } else {
        summaryHtml += `<p>Lista generada automáticamente según ingredientes por plato y comensales estimados.</p>`;
    }
    summary.innerHTML = summaryHtml;

    let rows = '';
    const sortedNames = Object.keys(list).sort();
    sortedNames.forEach(name => {
        const item = list[name];
        // Categorization logic
        const n = name.toLowerCase();
        let cat = 'Almacén';
        if (n.includes('carne') || n.includes('peceto') || n.includes('bola') || n.includes('molida')) cat = 'Cárnicos';
        else if (n.includes('pollo') || n.includes('ave') || n.includes('suprema')) cat = 'Aves';
        else if (n.includes('papa') || n.includes('tomate') || n.includes('cebolla') || n.includes('zanahoria') || n.includes('acelga')) cat = 'Verduras';
        else if (n.includes('leche') || n.includes('queso') || n.includes('yogur')) cat = 'Lácteos';

        rows += `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${name}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: var(--accent-blue);">${item.total.toFixed(2).replace(/\.00$/, '')}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.unit}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.85rem; color:#64748b;">${cat}</td>
            </tr>
        `;
    });
    tbody.innerHTML = rows || '<tr><td colspan="4" style="padding:30px; text-align:center; color:#94a3b8;">Sin datos. Genera la lista desde el planificador o importa un CSV.</td></tr>';
    
    switchKitchenTab('compras');
}

window.clearPlanningData = () => {
    if (confirm("¿Estás seguro de que deseas borrar TODA la planificación cargada (menús y platos importados)? Esto no borrará tus residentes ni comedores.")) {
        state.menuCycles = {};
        state.dishes = state.dishes.filter(d => !d.id.startsWith('dish_')); // Only keep manually created/default if any, but mostly clear all
        // Re-inject demo dish if empty
        if (state.dishes.length === 0) {
            state.dishes.push({
                id: 'dish_demo1', name: 'Merluza al Horno con Patatas',
                variations: { 'default': getEmptyVariation() }
            });
        }
        saveState();
        renderApp();
        renderMenuMatrix();
        alert("Planificación borrada exitosamente.");
    }
};

window.duplicateWeek = (week) => {
    const sourceWeek = week;
    const targetWeek = (parseInt(week) + 1).toString();
    if (!state.menuCycles[sourceWeek]) return;
    state.menuCycles[targetWeek] = JSON.parse(JSON.stringify(state.menuCycles[sourceWeek]));
    saveState();
    renderApp();
    renderMenuMatrix();
};

window.deleteWeek = (week) => {
    if (confirm(`¿Borrar toda la planificación de la semana ${week}?`)) {
        delete state.menuCycles[week];
        saveState();
        renderApp();
        renderMenuMatrix();
    }
};

function parseIngredientsCSV(text) {
    // Expected format: "Pollo 200g, Arroz 100g, etc" or "Pollo (200g)"
    const parts = text.split(/,|\n/);
    const ings = [];
    parts.forEach(p => {
        const clean = p.trim();
        if (!clean) return;
        
        // Extract number and unit
        const match = clean.match(/([\d\.,]+)\s*([a-zA-Z]+)/);
        if (match) {
            const amount = parseFloat(match[1].replace(',', '.'));
            const unit = match[2];
            const name = clean.replace(match[0], '').replace(/[()]/g, '').trim();
            ings.push({ name: name || 'Ingrediente', amount, unit });
        } else {
            ings.push({ name: clean, amount: 0, unit: 'u' });
        }
    });
    return ings;
}

function renderPlanDishes() {
    const list = document.getElementById('plan-dishes-list');
    if(!list) return;
    list.innerHTML = '';
    state.dishes.forEach(dish => {
        const html = `<div class="plan-dish-card" draggable="true" ondragstart="dragDish(event, '${dish.id}')" title="${dish.name}">${dish.name}</div>`;
        list.insertAdjacentHTML('beforeend', html);
    });
}

// Intercept original renderDishes to also update the plan list
const originalRenderDishes = renderDishes;
renderDishes = () => {
    originalRenderDishes();
    renderPlanDishes();
};

window.renderMenuMatrix = () => {
    const thead = document.getElementById('menu-thead');
    const tbody = document.getElementById('menu-tbody');
    if(!thead || !tbody) return;
    
    const week = document.getElementById('week-selector').value || '1';
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const dayIds = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    // Update PDF title
    const printHeader = document.getElementById('print-header-weekly');
    if(printHeader) {
         printHeader.innerHTML = `Menú Semanal - Semana ${week}`;
    }

    // Head
    let headHtml = `<tr><th style="width: 15%;">Dieta</th>`;
    days.forEach(d => headHtml += `<th>${d}</th>`);
    headHtml += `</tr>`;
    thead.innerHTML = headHtml;

    // Body
    let bodyHtml = '';
    state.diets.forEach(diet => {
        bodyHtml += `<tr>`;
        bodyHtml += `<td style="font-weight: 600; vertical-align: middle; background: ${diet.color}15; border-left: 5px solid ${diet.color};"><span class="color-box" style="background:${diet.color}; display:inline-block; margin-right:5px; vertical-align:middle;"></span>${diet.name}</td>`;
        
        dayIds.forEach(day => {
            const dayData = (state.menuCycles && state.menuCycles[week] && state.menuCycles[week][day] && state.menuCycles[week][day][diet.id]) || {};
            
            const lunchDish = state.dishes.find(d => d.id === dayData.lunch);
            const dinnerDish = state.dishes.find(d => d.id === dayData.dinner);

            const getSlotHtml = (type, dishObj) => {
                if (dishObj) {
                    return `<div class="menu-slot filled" ondrop="dropToMenu(event, '${day}', '${diet.id}', '${type}')" ondragover="allowDropMenu(event)">
                               <div class="slot-dish-name" onclick="viewRecipe('${dishObj.id}', '${diet.id}')" style="cursor:pointer;" title="Ver receta de: ${dishObj.name}">${dishObj.name}</div>
                               <button class="slot-remove-btn" onclick="removeFromMenu('${week}','${day}','${diet.id}','${type}')">✕</button>
                            </div>`;
                }
                return `<div class="menu-slot" ondrop="dropToMenu(event, '${day}', '${diet.id}', '${type}')" ondragover="allowDropMenu(event)">Arrastrar...</div>`;
            };

            bodyHtml += `
                <td>
                    <div class="menu-slot-container">
                         <div>
                             <div class="menu-slot-title">Comida</div>
                             ${getSlotHtml('lunch', lunchDish)}
                         </div>
                         <div style="margin-top: 5px;">
                             <div class="menu-slot-title">Cena</div>
                             ${getSlotHtml('dinner', dinnerDish)}
                         </div>
                    </div>
                </td>
            `;
        });
        bodyHtml += `</tr>`;
    });
    tbody.innerHTML = bodyHtml;
};

// Drag & Drop
window.dragDish = (ev, dishId) => {
    ev.dataTransfer.setData("dishId", dishId);
};

window.allowDropMenu = (ev) => {
    ev.preventDefault();
    document.querySelectorAll('.menu-slot').forEach(el => el.classList.remove('drag-over'));
    
    // Only highlight if dropping on the slot itself
    if(ev.currentTarget.classList.contains('menu-slot')) {
        ev.currentTarget.classList.add('drag-over');
    }
};

window.dropToMenu = (ev, day, dietId, type) => {
    ev.preventDefault();
    document.querySelectorAll('.menu-slot').forEach(el => el.classList.remove('drag-over'));
    
    const dishId = ev.dataTransfer.getData("dishId");
    if(!dishId) return;
    
    const dish = state.dishes.find(d => d.id === dishId);
    if(dish) {
        const dietObj = state.diets.find(d => d.id === dietId);
        const dictName = dietObj ? dietObj.name : dietId;
        
        let hasContent = false;
        const variation = dish.variations ? dish.variations[dietId] : null;
        if (variation) {
            if (variation.recipe && variation.recipe.trim().length > 0) hasContent = true;
            if (variation.ingredients && variation.ingredients.length > 0) hasContent = true;
        }
        
        if (!hasContent && dietId === 'basal') {
             const defaultVar = dish.variations ? dish.variations['default'] : null;
             if (defaultVar && ((defaultVar.recipe && defaultVar.recipe.trim().length > 0) || (defaultVar.ingredients && defaultVar.ingredients.length > 0))) {
                 hasContent = true;
             }
         }

        if (!hasContent) {
            alert(`No se puede agregar "${dish.name}" a la dieta "${dictName}" porque no tiene receta ni ingredientes en esta variante. Ve al Recetario y añade los datos en la pestaña de esta dieta.`);
            return;
        }
    }
    
    const week = document.getElementById('week-selector').value;
    
    if(!state.menuCycles) state.menuCycles = {};
    if(!state.menuCycles[week]) state.menuCycles[week] = {};
    if(!state.menuCycles[week][day]) state.menuCycles[week][day] = {};
    if(!state.menuCycles[week][day][dietId]) state.menuCycles[week][day][dietId] = {};
    
    state.menuCycles[week][day][dietId][type] = dishId;
    saveState();
    renderMenuMatrix();
};

window.removeFromMenu = (week, day, dietId, type) => {
    if(state.menuCycles && state.menuCycles[week] && state.menuCycles[week][day] && state.menuCycles[week][day][dietId]) {
        state.menuCycles[week][day][dietId][type] = null;
        saveState();
        renderMenuMatrix();
    }
};

// Make sure to load matrix when switching to planificador tab
const originalSwitchKitchenTab = window.switchKitchenTab;
window.switchKitchenTab = (tab) => {
    originalSwitchKitchenTab(tab);
    if(tab === 'planificador') {
        renderMenuMatrix();
    }
};

window.viewRecipe = (dishId, dietId) => {
    const dish = state.dishes.find(d => d.id === dishId);
    if(!dish) return;
    
    const dietObj = state.diets.find(d => d.id === dietId) || { name: 'General', color: '#64748b' };
    
    // Find precise variation or fallback to default
    let data = dish.variations[dietId];
    if (!data || (!data.ingredients && !data.recipe)) {
        data = dish.variations['default'] || getEmptyVariation();
    }
    
    document.getElementById('recipe-modal-title').textContent = dish.name;
    document.getElementById('recipe-modal-diet').textContent = dietObj.name;
    document.getElementById('recipe-modal-diet').style.backgroundColor = dietObj.color;
    
    document.getElementById('recipe-modal-macros').innerHTML = `
        <span title="Kcal">🔥 ${data.macros?.kcal || 0} kcal</span>
        <span title="Carbohidratos">🍞 ${data.macros?.carbs || 0} g</span>
        <span title="Proteínas">🥩 ${data.macros?.protein || 0} g</span>
        <span title="Grasas">🥑 ${data.macros?.fat || 0} g</span>
    `;
    
    let ingredientsHtml = '';
    if (typeof data.ingredients === 'string' && data.ingredients.trim()) {
        ingredientsHtml = `<p style="white-space: pre-wrap;">${data.ingredients}</p>`;
    } else if (Array.isArray(data.ingredients) && data.ingredients.length > 0) {
        ingredientsHtml = `
            <div style="display:flex; align-items:center; gap: 10px; margin-bottom: 15px; background: #e2e8f0; padding: 10px; border-radius: 4px;">
                 <label style="font-weight:600; font-size: 0.9rem;">Multiplicador de Comensales:</label>
                 <input type="number" id="recipe-scaler" value="1" min="1" step="1" style="width: 80px; padding: 5px; border-radius:4px; border:1px solid #ccc; font-weight: bold; text-align: center;" oninput="updateRecipeScale()">
            </div>
            <ul id="recipe-ing-calc-list" style="list-style-type: none; margin: 0; padding: 0;">
        `;
        data.ingredients.forEach((ing) => {
             ingredientsHtml += `<li data-base="${ing.amount}" data-unit="${ing.unit}" data-name="${ing.name}" style="padding: 5px 0; border-bottom: 1px solid #e2e8f0; display:flex; justify-content:space-between;">
                 <span style="font-weight: 500; font-family: monospace; color: var(--accent-blue); width: 100px;">
                     <span class="calc-val">${ing.amount}</span> <span style="color:#64748b; font-size:0.85rem;">${ing.unit}</span>
                 </span>
                 <span style="flex:1;">${ing.name}</span>
             </li>`;
        });
        ingredientsHtml += `</ul>`;
    } else {
        ingredientsHtml = '<p>No se han especificado ingredientes adaptados para esta dieta.</p>';
    }

    document.getElementById('recipe-modal-ingredients').innerHTML = ingredientsHtml;
    document.getElementById('recipe-modal-prep').textContent = data.recipe || 'No hay instrucciones detalladas de preparación.';
    
    document.getElementById('recipe-modal').classList.add('show');
};

window.updateRecipeScale = () => {
    const scale = parseInt(document.getElementById('recipe-scaler').value) || 1;
    const lis = document.querySelectorAll('#recipe-ing-calc-list li');
    lis.forEach(li => {
         const baseAmount = parseFloat(li.getAttribute('data-base'));
         const calcAmount = baseAmount * scale;
         const displayAmount = Number.isInteger(calcAmount) ? calcAmount : calcAmount.toFixed(1);
         li.querySelector('.calc-val').textContent = displayAmount;
    });
};

// ================== PDF EXPORT FUNCTIONS ==================

/**
 * Export Comedor layout as a single-page PDF.
 * Uses CSS zoom (not transform) so the layout box actually shrinks,
 * preventing the browser from paginating across multiple pages.
 */
window.exportComedorPDF = () => {
    const dr = document.getElementById('dining-room');
    const canvasContainer = dr.parentElement; // .canvas-container
    const tableEls = dr.querySelectorAll('.table-container');

    if (tableEls.length === 0) {
        alert('No hay mesas para exportar en este comedor.');
        return;
    }

    // 1. Read bounds from the rendered table elements
    const drRect = dr.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxRight = 0, maxBottom = 0;

    tableEls.forEach(el => {
        const elRect = el.getBoundingClientRect();
        const relLeft = elRect.left - drRect.left;
        const relTop = elRect.top - drRect.top;
        const relRight = elRect.right - drRect.left;
        const relBottom = elRect.bottom - drRect.top;
        
        if (relLeft < minX) minX = relLeft;
        if (relTop < minY) minY = relTop;
        if (relRight > maxRight) maxRight = relRight;
        if (relBottom > maxBottom) maxBottom = relBottom;
    });

    // 2. Reposition tables to remove dead space
    const pad = 15;
    const shiftX = minX - pad;
    const shiftY = minY - pad;

    const origPositions = [];
    const activeTables = state.tables.filter(t => t.diningRoomId === state.activeDiningRoomId);
    
    activeTables.forEach(t => {
        const el = document.getElementById(t.id);
        if (el) {
            origPositions.push({ id: t.id, left: el.style.left, top: el.style.top });
            el.style.left = (t.x - shiftX) + 'px';
            el.style.top = (t.y - shiftY) + 'px';
        }
    });

    // 3. Content size after repositioning
    const contentW = (maxRight - minX) + pad * 2;
    const contentH = (maxBottom - minY) + pad * 2;

    // 4. Save originals
    const orig = {
        drW: dr.style.width,
        drH: dr.style.height,
        drZoom: dr.style.zoom,
        ccW: canvasContainer.style.width,
        ccH: canvasContainer.style.height,
        ccOverflow: canvasContainer.style.overflow,
        ccBorder: canvasContainer.style.border,
        ccBoxShadow: canvasContainer.style.boxShadow,
    };

    // 5. Resize dining room to exact content bounds
    dr.style.width = contentW + 'px';
    dr.style.height = contentH + 'px';

    // 6. Auto-choose orientation based on content aspect ratio
    //    A4 at 96dpi: 794 x 1123 px. Margins: 8mm ~ 30px each side.
    //    Available print area: ~734 x 1063 (portrait) or ~1063 x 734 (landscape)
    //    Reserve space for: header (~45px) + legends block (~120px)
    const headerReserve = 45;
    const legendReserve = 120;
    const marginPx = 30; // 8mm at 96dpi

    const portraitPageW = 794 - marginPx * 2; // ~734
    const portraitPageH = 1123 - marginPx * 2 - headerReserve - legendReserve; // ~858
    const landscapePageW = 1123 - marginPx * 2; // ~1063
    const landscapePageH = 794 - marginPx * 2 - headerReserve - legendReserve; // ~569

    // Calculate zoom for each orientation
    const portraitZoom = Math.min(portraitPageW / contentW, portraitPageH / contentH, 1.8);
    const landscapeZoom = Math.min(landscapePageW / contentW, landscapePageH / contentH, 1.8);

    // Pick the orientation that produces the largest zoom (best fit)
    const aspectRatio = contentW / contentH;
    let orientation, pageW_eff, pageH_eff, zoomLevel;

    if (landscapeZoom > portraitZoom && aspectRatio > 0.9) {
        // Landscape is a better fit and the content is wider-ish
        orientation = 'landscape';
        pageW_eff = landscapePageW;
        pageH_eff = landscapePageH;
        zoomLevel = landscapeZoom;
    } else {
        // Portrait is better or content is very tall
        orientation = 'portrait';
        pageW_eff = portraitPageW;
        pageH_eff = portraitPageH;
        zoomLevel = portraitZoom;
    }

    dr.style.zoom = zoomLevel;

    // 7. Size the canvas container to the zoomed output so browser sees a small box
    canvasContainer.style.width = Math.ceil(contentW * zoomLevel) + 'px';
    canvasContainer.style.height = Math.ceil(contentH * zoomLevel) + 'px';
    canvasContainer.style.overflow = 'visible';

    // 7.5 Dynamically generate the used print legends
    const activeTableIds = activeTables.map(t => t.id);
    const drResidents = state.residents.filter(r => activeTableIds.includes(r.tableId));
    
    const usedDietIds = new Set(drResidents.map(r => r.diet));
    const usedConsistencies = new Set(drResidents.map(r => r.consistency));
    const hasThickener = drResidents.some(r => r.thickener && r.thickener !== 'none');
    const hasSupplement = drResidents.some(r => r.supplement);
    const hasAssistance = drResidents.some(r => r.assistance);
    
    let dietsHtml = '';
    state.diets.forEach(d => {
        if (usedDietIds.has(d.id)) {
            dietsHtml += `<div class="legend-item" style="margin:0;"><span class="color-box" style="background:${d.color}"></span> ${d.name}</div>`;
        }
    });
    if (!dietsHtml) dietsHtml = '<div style="font-size: 8px; color:#94a3b8;">No se asignaron dietas.</div>';

    let othersHtml = '';
    if (usedConsistencies.has('normal')) othersHtml += `<div class="legend-item" style="margin:0;"><span class="border-box cons-normal"></span> Normal</div>`;
    if (usedConsistencies.has('triturado')) othersHtml += `<div class="legend-item" style="margin:0;"><span class="border-box cons-triturado"></span> Triturado</div>`;
    if (usedConsistencies.has('precortado')) othersHtml += `<div class="legend-item" style="margin:0;"><span class="border-box cons-precortado"></span> Precortado</div>`;
    
    let additionalsHtml = '';
    if (hasThickener) additionalsHtml += `<div class="legend-item" style="margin:0;"><span class="thickener-marker" style="position:static; display:inline-flex; width:14px; height:14px;"><ion-icon name="star"></ion-icon></span> Espesante</div>`;
    if (hasSupplement) additionalsHtml += `<div class="legend-item" style="margin:0;"><span class="supplement-marker" style="position:static; display:inline-flex; width:14px; height:14px;"><ion-icon name="medical-outline"></ion-icon></span> Suplemento</div>`;
    if (hasAssistance) additionalsHtml += `<div class="legend-item" style="margin:0;"><span class="assistance-marker" style="position:static; display:inline-flex; width:14px; height:14px;"><ion-icon name="hand-right-outline"></ion-icon></span> Asistencia</div>`;
    
    if (additionalsHtml !== '' && othersHtml !== '') {
        othersHtml += `<div style="width: 1px; height: 12px; background: #94a3b8; margin: 0 4px;"></div>` + additionalsHtml;
    } else if (additionalsHtml !== '') {
        othersHtml += additionalsHtml;
    }
    if (!othersHtml) othersHtml = '<div style="font-size: 8px; color:#94a3b8;">Sin consistencias ni adicionales.</div>';

    const legendsContainer = document.getElementById('dynamic-print-legends');
    if (legendsContainer) {
        legendsContainer.innerHTML = `
            <h3>Leyenda — Dietas</h3>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 6px;">${dietsHtml}</div>
            <h3>Consistencia — Adicionales</h3>
            <div style="display: flex; gap: 14px; flex-wrap: wrap; align-items: center;">${othersHtml}</div>
        `;
        legendsContainer.style.display = 'block';
    }

    // 8. Add print class + dynamic page style
    document.body.classList.add('print-comedor');

    const pageStyle = document.createElement('style');
    pageStyle.id = 'comedor-page-style';
    pageStyle.textContent = `@page { size: ${orientation}; margin: 8mm; }`;
    document.head.appendChild(pageStyle);

    window.print();

    // 9. Restore EVERYTHING
    setTimeout(() => {
        document.body.classList.remove('print-comedor');
        dr.style.width = orig.drW;
        dr.style.height = orig.drH;
        dr.style.zoom = orig.drZoom || '';
        canvasContainer.style.width = orig.ccW;
        canvasContainer.style.height = orig.ccH;
        canvasContainer.style.overflow = orig.ccOverflow;

        origPositions.forEach(p => {
            const el = document.getElementById(p.id);
            if (el) {
                el.style.left = p.left;
                el.style.top = p.top;
            }
        });

        if (legendsContainer) {
            legendsContainer.style.display = 'none';
        }

        const ps = document.getElementById('comedor-page-style');
        if (ps) ps.remove();
    }, 500);
};

/**
 * Export the weekly menu as a single-page landscape PDF.
 */
window.exportMenuPDF = () => {
    // Generate current header
    const printHeader = document.getElementById('print-header-weekly');
    const week = document.getElementById('week-selector')?.value || '1';
    const venue = state.venues.find(v => v.id === state.activeVenueId);
    const venueName = venue ? venue.name : '';
    if (printHeader) {
        printHeader.innerHTML = `Menú Semanal — Semana ${week} — ${venueName}`;
    }

    document.body.classList.add('print-menu');

    // Inject a dynamic style to force landscape page
    const pageStyle = document.createElement('style');
    pageStyle.id = 'menu-page-style';
    pageStyle.textContent = `@page { size: landscape; margin: 8mm; }`;
    document.head.appendChild(pageStyle);

    window.print();

    setTimeout(() => {
        document.body.classList.remove('print-menu');
        const ps = document.getElementById('menu-page-style');
        if (ps) ps.remove();
    }, 500);
};

/**
 * Export the shopping list as a portrait PDF.
 */
window.exportShoppingPDF = () => {
    document.body.classList.add('print-shopping');

    const pageStyle = document.createElement('style');
    pageStyle.id = 'shopping-page-style';
    pageStyle.textContent = `@page { size: portrait; margin: 10mm; }`;
    document.head.appendChild(pageStyle);

    window.print();

    setTimeout(() => {
        document.body.classList.remove('print-shopping');
        const ps = document.getElementById('shopping-page-style');
        if (ps) ps.remove();
    }, 500);
};

// ================== AI PREPARATION METHOD GENERATOR ==================
// Generates preparation methods based on Paraguayan culinary traditions
// and geriatric residence standards. Fully editable after generation.

const AI_RECIPE_ENGINE = {
    cookingMethods: {
        'horno': {
            steps: ['Precalentar el horno a {temp}°C.', 'Disponer en fuente apta para horno ligeramente aceitada.', 'Hornear durante {time} minutos o hasta dorar levemente.', 'Verificar cocción interna con termómetro (mínimo {internalTemp}°C para seguridad geriátrica).', 'Dejar reposar 5 minutos antes de emplatar.'],
            temp: { default: 180, fish: 170, meat: 190, vegetable: 175 },
            time: { default: 25, fish: 18, meat: 35, vegetable: 20 },
            internalTemp: { default: 74, fish: 63, meat: 75, poultry: 82 }
        },
        'hervido': {
            steps: ['Llevar agua abundante a ebullición con una pizca de sal.', 'Incorporar {ingredient} y cocinar a fuego medio durante {time} minutos.', 'Verificar que esté tierno pinchando con tenedor.', 'Escurrir bien y reservar caliente.'],
            time: { default: 20, vegetable: 15, pasta: 12, legume: 45, potato: 25 }
        },
        'guiso': {
            steps: ['En olla amplia, calentar aceite a fuego medio.', 'Rehogar la cebolla picada fina hasta transparente (5-7 min).', 'Agregar ajo picado y cocinar 1 minuto más.', 'Incorporar {mainIngredient} y sellar por todos lados.', 'Añadir líquido (caldo o agua) hasta cubrir.', 'Condimentar con sal, pimentón dulce (no picante) y orégano.', 'Cocinar a fuego suave con tapa durante {time} minutos.', 'Verificar que la carne se deshaga fácilmente con tenedor.'],
            time: { default: 40, meat: 50, poultry: 35 }
        },
        'plancha': {
            steps: ['Calentar plancha o sartén antiadherente a fuego medio-alto.', 'Pincelar ligeramente con aceite de oliva o girasol.', 'Cocinar {ingredient} {time} minutos por cada lado.', 'No presionar durante la cocción para mantener jugosidad.', 'Verificar temperatura interna mínima de {internalTemp}°C.'],
            time: { default: 4, fish: 3, meat: 5 },
            internalTemp: { default: 74, fish: 63, meat: 75 }
        },
        'vapor': {
            steps: ['Colocar agua en la base de la vaporera sin que toque la rejilla.', 'Llevar a ebullición a fuego alto.', 'Disponer {ingredient} en la rejilla en una sola capa.', 'Tapar y cocinar al vapor durante {time} minutos.', 'Comprobar ternura con tenedor.', 'Nota geriátrica: Este método conserva nutrientes y facilita la masticación.'],
            time: { default: 15, fish: 12, vegetable: 10, potato: 20 }
        },
        'salteado': {
            steps: ['Cortar todos los ingredientes en trozos pequeños y uniformes.', 'Calentar aceite en sartén amplia a fuego medio.', 'Saltear {ingredient} removiendo frecuentemente durante {time} minutos.', 'Mantener la textura tierna evitando sobrecocción.'],
            time: { default: 8, vegetable: 6 }
        },
        'fritura_suave': {
            steps: ['Calentar aceite en sartén a fuego medio (no alto, por seguridad).', 'Freír por tandas pequeñas, {time} minutos por lado.', 'Retirar sobre papel absorbente para eliminar exceso de grasa.', 'NOTA GERIÁTRICA: Usar mínima cantidad de aceite. Preferir cocción al horno como alternativa más saludable.'],
            time: { default: 4 }
        },
        'estofado': {
            steps: ['Trozar {mainIngredient} en porciones aptas para adulto mayor (bocados medianos).', 'En cacerola, dorar ligeramente en aceite a fuego medio.', 'Agregar cebolla, morrón y tomate concassé.', 'Incorporar caldo tibio hasta cubrir a ¾ de altura.', 'Añadir condimentos suaves: laurel, perejil, pimentón dulce.', 'Cocinar a fuego bajo con tapa durante {time} minutos.', 'El resultado debe ser muy tierno, fácil de cortar con tenedor.'],
            time: { default: 45, meat: 60 }
        }
    },

    paraguayanTouches: {
        general: [
            'Condimentar con orégano fresco o seco (típico paraguayo) al final de la cocción.',
            'Si se desea, agregar un toque de cebollita de verdeo picada fina como terminación.',
            'Acompañar con mandioca hervida tierna (tradición paraguaya) cortada en bastones suaves.'
        ],
        starch: [
            'Incorporar almidón de mandioca para dar cuerpo (técnica paraguaya tradicional).',
            'Si se usa harina, preferir harina de maíz paraguaya para mayor valor nutricional.'
        ],
        dairy: [
            'Utilizar queso Paraguay fresco rallado para gratinar o enriquecer.',
            'Si se usa queso, preferir queso fresco blando (tipo queso Paraguay) por su textura suave ideal para adultos mayores.'
        ],
        soup: [
            'Preparar como una "sopa paraguaya" suave: incorporar los ingredientes húmedos al batido de maíz.',
            'Seguir la tradición del "vori-vori": formar bolitas pequeñas de maíz y queso para enriquecer caldos.',
            'Para caldos, seguir el estilo del "so\'o josopy" (sopa de carne molida con arroz y verduras).'
        ],
        meat: [
            'Marinar brevemente en jugo de limón paraguayo (lima) para ablandar fibras.',
            'Cocinar hasta que la carne esté muy tierna, facilitando la masticación en adultos mayores.'
        ],
        breakfast: [
            'Acompañar con cocido paraguayo (mate cocido) sin azúcar excesiva.',
            'Servir con "mbejú" blando (tortilla de almidón y queso) como alternativa al pan.'
        ]
    },

    geriatricStandards: {
        safety: [
            '⚕️ CONTROL GERIÁTRICO: Verificar temperatura de servicio entre 60-65°C (no más caliente para evitar quemaduras).',
            '⚕️ Cortar todos los alimentos en porciones pequeñas (máx. 2cm) para prevenir atragantamiento.',
            '⚕️ Asegurar textura tierna y húmeda; los alimentos secos son riesgo de disfagia.',
            '⚕️ Etiquetado: Indicar claramente el tipo de dieta en cada plato al servir.'
        ],
        presentation: [
            '🍽️ Emplatar de forma atractiva con colores variados para estimular el apetito.',
            '🍽️ Servir porciones adecuadas (no excesivas) en plato llano para facilitar el acceso.',
            '🍽️ Mantener la presentación individual separando componentes en el plato.'
        ],
        hydration: [
            '💧 Acompañar siempre con vaso de agua o infusión tibia.',
            '💧 Para residentes con espesante: preparar líquidos con la consistencia indicada en su ficha.'
        ],
        timing: [
            '⏰ Servir dentro de los 15 minutos posteriores a la preparación.',
            '⏰ Mantener en baño María o conservador caliente si hay demoras en el servicio.'
        ]
    },

    dietAdaptations: {
        'proteccion_gastrica': {
            prefix: '🛡️ ADAPTACIÓN PROTECCIÓN GÁSTRICA:\n',
            rules: [
                'NO utilizar: picantes, pimienta negra, ají, vinagre, cítricos concentrados.',
                'Evitar frituras. Preferir cocción al vapor, hervido u horno.',
                'Cocinar bien las verduras (no crudas) para facilitar la digestión.',
                'Usar aceite de oliva en crudo al final, nunca en fritura.',
                'Condimentar suavemente: solo sal moderada, orégano, perejil.',
                'Las porciones deben ser moderadas; mejor comer poco y frecuente.'
            ]
        },
        'proteccion_renal': {
            prefix: '🫘 ADAPTACIÓN PROTECCIÓN RENAL:\n',
            rules: [
                'Reducir SAL al mínimo. No agregar sal a la cocción; servir aparte si es necesario.',
                'Reducir el potasio: remojar las verduras/papas en agua abundante 2h antes de cocinar. Descartar el agua de remojo.',
                'Hervir las verduras en agua abundante y descartar el caldo (técnica de doble ebullición).',
                'Limitar proteínas según indicación médica: porciones de carne máx. 100-120g.',
                'Evitar: tomate concentrado, legumbres enteras, frutos secos, chocolate, plátano.',
                'Usar aceite de oliva como grasa principal (sin restricción renal).'
            ]
        },
        'diabetica': {
            prefix: '🩺 ADAPTACIÓN DIETA DIABÉTICA:\n',
            rules: [
                'NO agregar azúcar. Si necesita dulzor, usar edulcorante apto (sucralosa/stevia).',
                'Controlar las porciones de hidratos de carbono: arroz, papa, fideos, pan (máx. indicado por nutricionista).',
                'Preferir carbohidratos integrales o de bajo índice glucémico cuando estén disponibles.',
                'Incluir siempre fibra (verduras) en el plato para ralentizar la absorción.',
                'Evitar preparaciones con miel, dulce de leche, mermelada convencional.',
                'Mantener horarios regulares de comida (respetar ventana horaria).'
            ]
        },
        'blanda': {
            prefix: '🥄 ADAPTACIÓN DIETA BLANDA:\n',
            rules: [
                'Cocinar hasta obtener textura muy tierna, fácil de aplastar con tenedor.',
                'Evitar alimentos fibrosos, crujientes o con pieles duras.',
                'Las carnes deben estar guisadas o hervidas hasta deshilacharse.',
                'Verduras siempre muy cocidas, sin cáscaras ni semillas.',
                'Evitar: frutos secos, cereales integrales con cáscara, pan tostado duro.',
                'Acompañar con purés suaves o papas bien cocidas.'
            ]
        },
        'sin_gluten': {
            prefix: '🌾 ADAPTACIÓN SIN GLUTEN:\n',
            rules: [
                'Verificar TODOS los ingredientes: no usar harina de trigo, cebada, centeno ni avena contaminada.',
                'Sustituir harina de trigo por almidón de mandioca (fécula) o maicena.',
                'Usar fideos libres de gluten (arroz o maíz) si el plato lleva pasta.',
                'Limpiar y desinfectar superficies, utensilios y tablas antes de preparar.',
                'NO usar el mismo aceite de fritura usado para alimentos con gluten.',
                'IMPORTANTE: El almidón de mandioca paraguayo es naturalmente sin gluten y excelente sustituto.'
            ]
        },
        'sic': {
            prefix: '🔬 ADAPTACIÓN SÍNDROME INTESTINO CORTO (SIC):\n',
            rules: [
                'Porciones MUY pequeñas y frecuentes (6-8 tomas/día).',
                'Cocinar muy bien todos los alimentos para facilitar absorción.',
                'Evitar azúcares simples concentrados y bebidas hiperosmolares.',
                'Limitar grasas; usar aceite de oliva en pequeñas cantidades.',
                'Evitar fibra insoluble; preferir verduras sin piel y bien cocidas.',
                'Consultar con nutricionista la tolerancia individual antes de introducir nuevos ingredientes.'
            ]
        },
        'liquida': {
            prefix: '🥤 ADAPTACIÓN DIETA LÍQUIDA:\n',
            rules: [
                'Procesar TODOS los ingredientes hasta obtener consistencia completamente líquida.',
                'Pasar por colador fino o chino después de licuar para eliminar grumos.',
                'Enriquecer con proteína en polvo si está indicado por el equipo médico.',
                'Servir a temperatura tibia (55-60°C), nunca hirviendo.',
                'Verificar que no queden trozos sólidos que puedan causar aspiración.',
                'Ajustar consistencia con caldo o leche según tolerancia del residente.'
            ]
        },
        'triturada': {
            prefix: '🔄 ADAPTACIÓN DIETA TRITURADA (Disfagia):\n',
            rules: [
                'Triturar con minipimer o procesador hasta obtener textura homogénea tipo puré.',
                'Consistencia: debe mantener forma en la cuchara sin gotear (prueba de la cuchara invertida).',
                'NO mezclar diferentes platos en un solo triturado; procesar cada componente por separado.',
                'Presentar cada componente triturado por separado en el plato.',
                'Agregar líquido (caldo, salsa, aceite) durante el triturado para lograr textura suave.',
                'PROHIBIDO: trozos, fibras, semillas, pieles o grumos. Pasar por colador si es necesario.',
                'Servir inmediatamente después de triturar. No recalentar triturados.'
            ]
        },
        'vegetariana': {
            prefix: '🥬 ADAPTACIÓN VEGETARIANA:\n',
            rules: [
                'Sustituir proteína animal por legumbres bien cocidas, huevo, queso o tofu.',
                'Asegurar aporte proteico suficiente combinando legumbres + cereal (ej: poroto + arroz).',
                'En contexto paraguayo: usar porotos, choclo, mandioca y queso Paraguay como bases proteicas.',
                'Enriquecer con semillas molidas (no enteras, por seguridad geriátrica).',
                'Verificar que caldos y salsas sean vegetales (sin base de huesos).'
            ]
        }
    },

    ingredientPatterns: {
        protein: { keywords: ['pollo', 'carne', 'peceto', 'bife', 'merluza', 'pescado', 'huevo', 'cerdo', 'suprema', 'muslo', 'pechuga', 'lomo', 'milanesa', 'surubi', 'dorado', 'pacu'], type: 'protein' },
        starch: { keywords: ['arroz', 'papa', 'patata', 'fideo', 'spaghetti', 'tallarin', 'mandioca', 'batata', 'polenta', 'ñoqui', 'harina', 'maíz', 'choclo'], type: 'starch' },
        vegetable: { keywords: ['zapallo', 'tomate', 'cebolla', 'zanahoria', 'calabaza', 'acelga', 'espinaca', 'lechuga', 'morrón', 'pimiento', 'berenjena', 'chaucha', 'arvejas', 'poroto', 'remolacha', 'pepino', 'brócoli'], type: 'vegetable' },
        dairy: { keywords: ['queso', 'leche', 'crema', 'yogur', 'manteca', 'ricota'], type: 'dairy' },
        fruit: { keywords: ['manzana', 'banana', 'naranja', 'mandarina', 'pera', 'durazno', 'frutilla', 'mamón', 'guayaba', 'pomelo'], type: 'fruit' }
    },

    dishPatterns: [
        { pattern: /milanesa/i, method: 'horno', note: 'Preparar como milanesa al horno (evitar fritura profunda en geriatría). Pasar por huevo y pan rallado fino.' },
        { pattern: /guiso|estofado|locro/i, method: 'guiso', note: '' },
        { pattern: /sopa|caldo|vori.?vori|so.o.?josopy/i, method: 'hervido', note: 'Preparar como sopa tradicional paraguaya con cocción prolongada.' },
        { pattern: /pastel.?mandi/i, method: 'horno', note: 'Preparar la masa con mandioca rallada y queso Paraguay. Hornear en molde enmantecado.' },
        { pattern: /chipa/i, method: 'horno', note: 'Preparar la masa con almidón de mandioca, queso, huevo y grasa. Formar piezas y hornear.' },
        { pattern: /sopa.?paraguaya/i, method: 'horno', note: 'Mezclar harina de maíz con cebolla rehogada, queso Paraguay, huevos y leche. Hornear en fuente.' },
        { pattern: /mbej[uú]/i, method: 'plancha', note: 'Mezclar almidón de mandioca con queso Paraguay y leche/agua. Cocinar en sartén antiadherente a fuego suave.' },
        { pattern: /empanada/i, method: 'horno', note: 'Preparar empanadas al horno (no fritas). Sellar bien los bordes para evitar que se abran.' },
        { pattern: /pure|puré/i, method: 'hervido', note: 'Hervir hasta muy tierno y procesar con pisapuré. Agregar leche tibia y manteca para cremosidad.' },
        { pattern: /fideos|pasta|spaghetti|tallarin/i, method: 'hervido', note: 'Cocinar la pasta al dente suave (1-2 min más del tiempo normal para facilitar masticación geriátrica).' },
        { pattern: /arroz/i, method: 'hervido', note: 'Cocinar el arroz con el doble de agua y dejar que absorba completamente. Debe quedar suelto pero tierno.' },
        { pattern: /ensalada/i, method: 'salteado', note: 'En residencia geriátrica, las verduras deben estar cocidas o blanqueadas. Evitar crudas por riesgo de atragantamiento.' },
        { pattern: /tortilla|revuelto/i, method: 'plancha', note: 'Batir bien los huevos. Cocinar a fuego bajo para que cuaje uniformemente. La tortilla debe estar bien cocida por norma geriátrica.' },
        { pattern: /tarta|tartaleta|quiche/i, method: 'horno', note: 'Preparar con masa fina. El relleno debe estar bien cocido antes de hornear.' },
        { pattern: /asado|parrilla/i, method: 'horno', note: 'En residencia geriátrica: adaptar a cocción en horno a baja temperatura (160°C) durante tiempo prolongado para máxima ternura.' },
        { pattern: /albóndiga|albondiga/i, method: 'guiso', note: 'Formar albóndigas pequeñas (tamaño bocado geriátrico). Cocinar en salsa para mantener jugosidad.' },
        { pattern: /croqueta/i, method: 'horno', note: 'Formar croquetas y hornear (no freír). Pincelar con huevo batido antes de hornear para dorar.' },
        { pattern: /flan|postre|budín|budin/i, method: 'horno', note: 'Cocinar a baño María en horno a 160°C. Debe quedar firme pero tembloroso. Desmoldar frío.' },
        { pattern: /payagua.?mascada/i, method: 'fritura_suave', note: 'Preparar la masa con carne molida y mandioca. Adaptar a horno (180°C, 20 min) para versión geriátrica más saludable.' }
    ]
};

function analyzeCurrentIngredients() {
    const rows = document.querySelectorAll('#ingredients-list .ing-row');
    const ingredients = [];
    const categories = new Set();
    rows.forEach(r => {
        const name = r.querySelector('.ing-name').value.trim();
        const amount = r.querySelector('.ing-amount').value;
        const unit = r.querySelector('.ing-unit').value;
        if (name) {
            ingredients.push({ name, amount, unit });
            const lower = name.toLowerCase();
            for (const [cat, info] of Object.entries(AI_RECIPE_ENGINE.ingredientPatterns)) {
                if (info.keywords.some(kw => lower.includes(kw))) {
                    categories.add(cat);
                }
            }
        }
    });
    return { ingredients, categories: Array.from(categories) };
}

function determineCookingMethod(dishName, categories) {
    for (const dp of AI_RECIPE_ENGINE.dishPatterns) {
        if (dp.pattern.test(dishName)) {
            return { method: dp.method, note: dp.note };
        }
    }
    if (categories.includes('protein')) {
        const dl = dishName.toLowerCase();
        if (dl.includes('guiso') || dl.includes('estofado')) return { method: 'guiso', note: '' };
        if (dl.includes('plancha') || dl.includes('grillado')) return { method: 'plancha', note: '' };
        if (dl.includes('vapor')) return { method: 'vapor', note: '' };
        return { method: 'horno', note: '' };
    }
    if (categories.includes('starch')) return { method: 'hervido', note: '' };
    if (categories.includes('vegetable')) return { method: 'salteado', note: '' };
    return { method: 'horno', note: '' };
}

function getIngredientSubtype(ingredients) {
    const all = ingredients.map(i => i.name.toLowerCase()).join(' ');
    if (all.match(/merluza|pescado|surubi|dorado|pacu|atún|salmon/)) return 'fish';
    if (all.match(/pollo|suprema|muslo|pechuga|ave/)) return 'poultry';
    if (all.match(/carne|peceto|bife|lomo|cerdo|ternera|vacuno/)) return 'meat';
    if (all.match(/papa|patata|batata|mandioca/)) return 'potato';
    if (all.match(/fideo|spaghetti|tallarin|pasta/)) return 'pasta';
    if (all.match(/poroto|lenteja|garbanzo/)) return 'legume';
    if (all.match(/zapallo|zanahoria|acelga|espinaca|verdura/)) return 'vegetable';
    return 'default';
}

function buildPreparationText(dishName, ingredients, categories, dietId) {
    const { method, note } = determineCookingMethod(dishName, categories);
    const methodData = AI_RECIPE_ENGINE.cookingMethods[method];
    const subtype = getIngredientSubtype(ingredients);
    let text = '';
    let stepNum = 1;

    // Diet adaptation header
    const dietAdapt = AI_RECIPE_ENGINE.dietAdaptations[dietId];
    if (dietAdapt) {
        text += dietAdapt.prefix;
        dietAdapt.rules.forEach(r => { text += `• ${r}\n`; });
        text += '\n--- MÉTODO DE PREPARACIÓN ---\n\n';
    } else {
        text += `📋 MÉTODO DE PREPARACIÓN — ${dishName.toUpperCase()}\n`;
        text += `${'═'.repeat(40)}\n\n`;
    }

    if (note) { text += `📌 ${note}\n\n`; }

    // Preparation phase
    text += `🔪 PREPARACIÓN PREVIA:\n`;
    if (ingredients.length > 0) {
        ingredients.forEach(ing => {
            const lower = ing.name.toLowerCase();
            if (AI_RECIPE_ENGINE.ingredientPatterns.protein.keywords.some(k => lower.includes(k))) {
                text += `${stepNum}. Lavar y secar ${ing.name}. Cortar en porciones individuales aptas para adulto mayor (bocados medianos, sin huesos pequeños).\n`;
            } else if (AI_RECIPE_ENGINE.ingredientPatterns.vegetable.keywords.some(k => lower.includes(k))) {
                text += `${stepNum}. Lavar, pelar y cortar ${ing.name} en trozos pequeños (máx. 1.5cm).\n`;
            } else if (AI_RECIPE_ENGINE.ingredientPatterns.starch.keywords.some(k => lower.includes(k))) {
                text += `${stepNum}. Preparar ${ing.name}: ${lower.includes('papa') || lower.includes('mandioca') || lower.includes('batata') ? 'pelar, lavar y cortar en trozos' : 'medir la porción indicada'}.\n`;
            } else if (AI_RECIPE_ENGINE.ingredientPatterns.dairy.keywords.some(k => lower.includes(k))) {
                text += `${stepNum}. ${ing.name}: ${lower.includes('queso') ? 'rallar o cortar en cubos pequeños' : 'temperar a temperatura ambiente'}.\n`;
            } else {
                text += `${stepNum}. Preparar ${ing.name}${ing.amount ? ` (${ing.amount}${ing.unit} por persona)` : ''}.\n`;
            }
            stepNum++;
        });
    } else {
        text += `${stepNum}. Preparar y medir todos los ingredientes antes de comenzar.\n`;
        stepNum++;
    }
    text += '\n';

    // Cooking phase
    text += `🍳 COCCIÓN:\n`;
    if (methodData && methodData.steps) {
        methodData.steps.forEach(step => {
            let s = step;
            const mainIng = ingredients.length > 0 ? ingredients[0].name : 'los ingredientes principales';
            s = s.replace('{ingredient}', mainIng).replace('{mainIngredient}', mainIng);
            if (methodData.temp) s = s.replace('{temp}', methodData.temp[subtype] || methodData.temp.default);
            if (methodData.time) s = s.replace('{time}', methodData.time[subtype] || methodData.time.default);
            if (methodData.internalTemp) s = s.replace('{internalTemp}', methodData.internalTemp[subtype] || methodData.internalTemp.default);
            text += `${stepNum}. ${s}\n`;
            stepNum++;
        });
    }
    text += '\n';

    // Paraguayan touches
    text += `🇵🇾 TOQUE PARAGUAYO:\n`;
    const touchCats = [];
    if (categories.includes('protein')) touchCats.push('meat');
    if (categories.includes('dairy')) touchCats.push('dairy');
    if (categories.includes('starch')) touchCats.push('starch');
    if (dishName.toLowerCase().match(/sopa|caldo/)) touchCats.push('soup');

    const gTouches = AI_RECIPE_ENGINE.paraguayanTouches.general;
    text += `${stepNum}. ${gTouches[Math.floor(Math.random() * gTouches.length)]}\n`;
    stepNum++;
    touchCats.forEach(tc => {
        const t = AI_RECIPE_ENGINE.paraguayanTouches[tc];
        if (t && t.length > 0) { text += `${stepNum}. ${t[Math.floor(Math.random() * t.length)]}\n`; stepNum++; }
    });
    text += '\n';

    // Post-processing for triturada/liquida
    if (dietId === 'triturada' || dietId === 'liquida') {
        text += `⚠️ POST-PROCESAMIENTO TEXTURA:\n`;
        if (dietId === 'triturada') {
            text += `${stepNum}. Una vez cocido, triturar CADA componente por separado con minipimer hasta textura puré homogénea.\n`; stepNum++;
            text += `${stepNum}. Verificar ausencia de grumos, fibras o trozos sólidos.\n`; stepNum++;
            text += `${stepNum}. Agregar caldo o salsa durante el triturado para obtener consistencia tipo puré espeso.\n`; stepNum++;
            text += `${stepNum}. Presentar cada componente triturado por separado en el plato para mantener identidad visual.\n`; stepNum++;
        } else {
            text += `${stepNum}. Licuar TODOS los ingredientes cocidos hasta consistencia completamente líquida.\n`; stepNum++;
            text += `${stepNum}. Pasar por colador fino o chino. No deben quedar partículas sólidas.\n`; stepNum++;
            text += `${stepNum}. Ajustar densidad con caldo o leche según indicación del nutricionista.\n`; stepNum++;
        }
        text += '\n';
    }

    // Geriatric standards
    text += `⚕️ NORMAS GERIÁTRICAS DE SERVICIO:\n`;
    text += `${stepNum}. ${AI_RECIPE_ENGINE.geriatricStandards.safety[0]}\n`; stepNum++;
    text += `${stepNum}. ${AI_RECIPE_ENGINE.geriatricStandards.safety[1]}\n`; stepNum++;
    text += `${stepNum}. ${AI_RECIPE_ENGINE.geriatricStandards.presentation[0]}\n`; stepNum++;
    text += `${stepNum}. ${AI_RECIPE_ENGINE.geriatricStandards.hydration[0]}\n`; stepNum++;
    text += `${stepNum}. ${AI_RECIPE_ENGINE.geriatricStandards.timing[0]}\n`; stepNum++;

    return text;
}

/**
 * Main entry: Generate AI preparation and animate into textarea.
 */
window.generateAIPreparation = async () => {
    const dishName = document.getElementById('dish-name').value.trim();
    if (!dishName) {
        alert('Ingresa primero el nombre del plato para generar la preparación.');
        return;
    }

    const btn = document.getElementById('ai-gen-prep-btn');
    const textEl = btn.querySelector('.ai-gen-text');
    const iconEl = btn.querySelector('.ai-gen-icon');
    const loadingEl = btn.querySelector('.ai-gen-loading');
    const infoEl = document.getElementById('ai-gen-info');
    const textarea = document.getElementById('dish-prep');

    if (textarea.value.trim().length > 0) {
        if (!confirm('El campo de preparación ya tiene contenido. ¿Desea reemplazarlo con una receta generada por IA?')) {
            return;
        }
    }

    // Loading state
    btn.classList.add('generating');
    textEl.style.display = 'none';
    iconEl.style.display = 'none';
    loadingEl.style.display = 'inline-flex';
    textarea.value = '';
    textarea.classList.add('ai-typing');

    const { ingredients, categories } = analyzeCurrentIngredients();
    const dietId = activeDishTab === 'default' ? null : activeDishTab;

    await new Promise(resolve => setTimeout(resolve, 800));

    const fullText = buildPreparationText(dishName, ingredients, categories, dietId);

    // Typewriter animation
    let charIndex = 0;
    const charsPerFrame = 3;
    const frameDelay = 12;

    await new Promise(resolve => {
        const typeInterval = setInterval(() => {
            charIndex += charsPerFrame;
            if (charIndex >= fullText.length) {
                textarea.value = fullText;
                clearInterval(typeInterval);
                resolve();
            } else {
                textarea.value = fullText.substring(0, charIndex);
                textarea.scrollTop = textarea.scrollHeight;
            }
        }, frameDelay);
    });

    // End loading
    btn.classList.remove('generating');
    textEl.style.display = 'inline';
    iconEl.style.display = 'inline';
    loadingEl.style.display = 'none';
    textarea.classList.remove('ai-typing');
    infoEl.style.display = 'block';

    textarea.rows = Math.max(6, Math.min(20, fullText.split('\n').length + 2));

    // Completion flash
    textarea.style.borderColor = '#10b981';
    textarea.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)';
    setTimeout(() => {
        textarea.style.borderColor = '';
        textarea.style.boxShadow = '';
    }, 2000);
};

// ═══════════════════════════════════════════════════════════════════════════
// AI Macro Calculation — estimates kcal/carbs/protein/fat from ingredient list
// ═══════════════════════════════════════════════════════════════════════════

// Nutritional database (per 100g) — common ingredients in Paraguayan geriatric cuisine
const _NUTRI_DB = {
    // Proteins
    'pollo':        { kcal: 239, carbs: 0,    protein: 27,  fat: 14 },
    'pechuga':      { kcal: 165, carbs: 0,    protein: 31,  fat: 3.6 },
    'muslo':        { kcal: 209, carbs: 0,    protein: 26,  fat: 10.9 },
    'carne':        { kcal: 250, carbs: 0,    protein: 26,  fat: 15 },
    'carne vacuna': { kcal: 250, carbs: 0,    protein: 26,  fat: 15 },
    'carne molida': { kcal: 332, carbs: 0,    protein: 14,  fat: 30 },
    'carne picada': { kcal: 332, carbs: 0,    protein: 14,  fat: 30 },
    'bife':         { kcal: 271, carbs: 0,    protein: 26,  fat: 18 },
    'cerdo':        { kcal: 242, carbs: 0,    protein: 27,  fat: 14 },
    'pescado':      { kcal: 206, carbs: 0,    protein: 22,  fat: 12 },
    'surubí':       { kcal: 96,  carbs: 0,    protein: 20,  fat: 1.5 },
    'tilapia':      { kcal: 96,  carbs: 0,    protein: 20,  fat: 1.7 },
    'merluza':      { kcal: 90,  carbs: 0,    protein: 18,  fat: 1.3 },
    'atún':         { kcal: 130, carbs: 0,    protein: 28,  fat: 1 },
    'huevo':        { kcal: 155, carbs: 1.1,  protein: 13,  fat: 11 },
    'huevos':       { kcal: 155, carbs: 1.1,  protein: 13,  fat: 11 },
    'jamón':        { kcal: 145, carbs: 1.5,  protein: 21,  fat: 5.5 },
    'salchicha':    { kcal: 301, carbs: 2,    protein: 12,  fat: 27 },

    // Dairy
    'leche':        { kcal: 61,  carbs: 4.8,  protein: 3.2, fat: 3.3 },
    'queso':        { kcal: 402, carbs: 1.3,  protein: 25,  fat: 33 },
    'queso paraguay': { kcal: 370, carbs: 1,  protein: 24,  fat: 30 },
    'queso fresco': { kcal: 174, carbs: 2.7,  protein: 14,  fat: 12 },
    'crema':        { kcal: 340, carbs: 2.8,  protein: 2,   fat: 36 },
    'crema de leche': { kcal: 340, carbs: 2.8, protein: 2,  fat: 36 },
    'yogur':        { kcal: 61,  carbs: 3.6,  protein: 3.5, fat: 3.3 },
    'manteca':      { kcal: 717, carbs: 0.1,  protein: 0.9, fat: 81 },
    'mantequilla':  { kcal: 717, carbs: 0.1,  protein: 0.9, fat: 81 },

    // Starches & Grains
    'arroz':        { kcal: 130, carbs: 28,   protein: 2.7, fat: 0.3 },
    'fideo':        { kcal: 131, carbs: 25,   protein: 5,   fat: 1.1 },
    'fideos':       { kcal: 131, carbs: 25,   protein: 5,   fat: 1.1 },
    'pasta':        { kcal: 131, carbs: 25,   protein: 5,   fat: 1.1 },
    'tallarín':     { kcal: 131, carbs: 25,   protein: 5,   fat: 1.1 },
    'tallarines':   { kcal: 131, carbs: 25,   protein: 5,   fat: 1.1 },
    'papa':         { kcal: 77,  carbs: 17,   protein: 2,   fat: 0.1 },
    'papas':        { kcal: 77,  carbs: 17,   protein: 2,   fat: 0.1 },
    'batata':       { kcal: 86,  carbs: 20,   protein: 1.6, fat: 0.1 },
    'mandioca':     { kcal: 160, carbs: 38,   protein: 1.4, fat: 0.3 },
    'yuca':         { kcal: 160, carbs: 38,   protein: 1.4, fat: 0.3 },
    'pan':          { kcal: 265, carbs: 49,   protein: 9,   fat: 3.2 },
    'pan rallado':  { kcal: 395, carbs: 72,   protein: 13,  fat: 5 },
    'harina':       { kcal: 364, carbs: 76,   protein: 10,  fat: 1 },
    'harina de maíz': { kcal: 370, carbs: 79, protein: 7,   fat: 3.9 },
    'maíz':         { kcal: 86,  carbs: 19,   protein: 3.3, fat: 1.4 },
    'choclo':       { kcal: 86,  carbs: 19,   protein: 3.3, fat: 1.4 },
    'avena':        { kcal: 68,  carbs: 12,   protein: 2.4, fat: 1.4 },
    'polenta':      { kcal: 370, carbs: 79,   protein: 7,   fat: 3.9 },
    'ñoquis':       { kcal: 133, carbs: 20,   protein: 4.5, fat: 3.8 },
    'gnocchi':      { kcal: 133, carbs: 20,   protein: 4.5, fat: 3.8 },

    // Legumes
    'poroto':       { kcal: 347, carbs: 63,   protein: 21,  fat: 1.2 },
    'porotos':      { kcal: 347, carbs: 63,   protein: 21,  fat: 1.2 },
    'lenteja':      { kcal: 116, carbs: 20,   protein: 9,   fat: 0.4 },
    'lentejas':     { kcal: 116, carbs: 20,   protein: 9,   fat: 0.4 },
    'garbanzo':     { kcal: 164, carbs: 27,   protein: 8.9, fat: 2.6 },
    'garbanzos':    { kcal: 164, carbs: 27,   protein: 8.9, fat: 2.6 },
    'soja':         { kcal: 446, carbs: 30,   protein: 36,  fat: 20 },

    // Vegetables
    'tomate':       { kcal: 18,  carbs: 3.9,  protein: 0.9, fat: 0.2 },
    'cebolla':      { kcal: 40,  carbs: 9.3,  protein: 1.1, fat: 0.1 },
    'ajo':          { kcal: 149, carbs: 33,   protein: 6.4, fat: 0.5 },
    'zanahoria':    { kcal: 41,  carbs: 10,   protein: 0.9, fat: 0.2 },
    'zapallo':      { kcal: 26,  carbs: 6.5,  protein: 1,   fat: 0.1 },
    'calabaza':     { kcal: 26,  carbs: 6.5,  protein: 1,   fat: 0.1 },
    'zapallito':    { kcal: 17,  carbs: 3.4,  protein: 1.2, fat: 0.2 },
    'calabacín':    { kcal: 17,  carbs: 3.4,  protein: 1.2, fat: 0.2 },
    'berenjena':    { kcal: 25,  carbs: 6,    protein: 1,   fat: 0.2 },
    'pimiento':     { kcal: 20,  carbs: 4.6,  protein: 0.9, fat: 0.2 },
    'morrón':       { kcal: 20,  carbs: 4.6,  protein: 0.9, fat: 0.2 },
    'lechuga':      { kcal: 15,  carbs: 2.9,  protein: 1.4, fat: 0.2 },
    'espinaca':     { kcal: 23,  carbs: 3.6,  protein: 2.9, fat: 0.4 },
    'acelga':       { kcal: 19,  carbs: 3.7,  protein: 1.8, fat: 0.2 },
    'chaucha':      { kcal: 31,  carbs: 7,    protein: 1.8, fat: 0.1 },
    'remolacha':    { kcal: 43,  carbs: 10,   protein: 1.6, fat: 0.2 },
    'repollo':      { kcal: 25,  carbs: 5.8,  protein: 1.3, fat: 0.1 },
    'brócoli':      { kcal: 34,  carbs: 7,    protein: 2.8, fat: 0.4 },
    'coliflor':     { kcal: 25,  carbs: 5,    protein: 1.9, fat: 0.3 },
    'arvejas':      { kcal: 81,  carbs: 14,   protein: 5.4, fat: 0.4 },
    'choclo':       { kcal: 86,  carbs: 19,   protein: 3.3, fat: 1.4 },

    // Fruits
    'banana':       { kcal: 89,  carbs: 23,   protein: 1.1, fat: 0.3 },
    'manzana':      { kcal: 52,  carbs: 14,   protein: 0.3, fat: 0.2 },
    'naranja':      { kcal: 47,  carbs: 12,   protein: 0.9, fat: 0.1 },
    'durazno':      { kcal: 39,  carbs: 10,   protein: 0.9, fat: 0.3 },

    // Oils & Fats
    'aceite':       { kcal: 884, carbs: 0,    protein: 0,   fat: 100 },
    'aceite de oliva': { kcal: 884, carbs: 0, protein: 0,   fat: 100 },
    'aceite de girasol': { kcal: 884, carbs: 0, protein: 0, fat: 100 },
    'margarina':    { kcal: 717, carbs: 0.9,  protein: 0.2, fat: 80 },

    // Condiments & Others
    'azúcar':       { kcal: 387, carbs: 100,  protein: 0,   fat: 0 },
    'sal':          { kcal: 0,   carbs: 0,    protein: 0,   fat: 0 },
    'pimienta':     { kcal: 251, carbs: 64,   protein: 10,  fat: 3.3 },
    'caldo':        { kcal: 10,  carbs: 1,    protein: 0.5, fat: 0.3 },
    'salsa de tomate': { kcal: 29, carbs: 6,  protein: 1.3, fat: 0.2 },
    'salsa':        { kcal: 29,  carbs: 6,    protein: 1.3, fat: 0.2 },
    'mermelada':    { kcal: 250, carbs: 65,   protein: 0.3, fat: 0.1 },
    'dulce':        { kcal: 250, carbs: 65,   protein: 0.3, fat: 0.1 },
    'miel':         { kcal: 304, carbs: 82,   protein: 0.3, fat: 0 },
    'gelatina':     { kcal: 62,  carbs: 14,   protein: 1.2, fat: 0 },
    'agua':         { kcal: 0,   carbs: 0,    protein: 0,   fat: 0 },
};

// Fuzzy matching: find the best match for an ingredient name in the DB
function _findNutriMatch(name) {
    const lower = name.toLowerCase().trim();
    // Exact match first
    if (_NUTRI_DB[lower]) return _NUTRI_DB[lower];
    // Check if any DB key is contained in the name, or name contains a DB key
    let bestMatch = null;
    let bestLen = 0;
    for (const key of Object.keys(_NUTRI_DB)) {
        if (lower.includes(key) && key.length > bestLen) {
            bestMatch = _NUTRI_DB[key];
            bestLen = key.length;
        }
    }
    return bestMatch;
}

// Convert ingredient amount to grams for estimation
function _toGrams(amount, unit) {
    const a = parseFloat(amount) || 0;
    switch ((unit || 'g').toLowerCase()) {
        case 'g': case 'gr': case 'grs': return a;
        case 'kg': return a * 1000;
        case 'ml': return a; // approximate 1ml = 1g for most liquids
        case 'l': case 'lt': case 'lts': return a * 1000;
        case 'u': case 'un': case 'unidad': case 'unidades':
            return a * 60; // avg weight of 1 unit (egg ~60g, fruit ~120g, etc.)
        case 'cda': case 'cucharada': return a * 15;
        case 'cdita': case 'cucharadita': return a * 5;
        case 'taza': return a * 240;
        case 'pizca': return a * 0.5;
        default: return a;
    }
}

window.calcMacrosAI = async function() {
    const btn = document.getElementById('ai-calc-macros-btn');
    const textEl = btn.querySelector('.ai-calc-text');
    const loadingEl = btn.querySelector('.ai-calc-loading');

    // Gather current ingredients from the form
    const rows = document.querySelectorAll('#ingredients-list .ingredient-row');
    if (rows.length === 0) {
        alert('Agrega ingredientes primero para calcular los macros.');
        return;
    }

    // Show loading state
    textEl.style.display = 'none';
    loadingEl.style.display = 'inline-flex';
    btn.disabled = true;

    await new Promise(r => setTimeout(r, 600)); // Simulate AI processing

    let totalKcal = 0, totalCarbs = 0, totalProtein = 0, totalFat = 0;
    let matched = 0, unmatched = [];

    rows.forEach(row => {
        const nameEl = row.querySelector('.ing-name');
        const amountEl = row.querySelector('.ing-amount');
        const unitEl = row.querySelector('.ing-unit');
        if (!nameEl || !nameEl.value.trim()) return;

        const name = nameEl.value.trim();
        const amount = amountEl ? amountEl.value : '100';
        const unit = unitEl ? unitEl.value : 'g';
        const grams = _toGrams(amount, unit);

        const nutri = _findNutriMatch(name);
        if (nutri) {
            const factor = grams / 100;
            totalKcal += nutri.kcal * factor;
            totalCarbs += nutri.carbs * factor;
            totalProtein += nutri.protein * factor;
            totalFat += nutri.fat * factor;
            matched++;
        } else {
            unmatched.push(name);
        }
    });

    // Fill in the form fields
    document.getElementById('dish-kcal').value = Math.round(totalKcal);
    document.getElementById('dish-carbs').value = Math.round(totalCarbs * 10) / 10;
    document.getElementById('dish-protein').value = Math.round(totalProtein * 10) / 10;
    document.getElementById('dish-fat').value = Math.round(totalFat * 10) / 10;

    // End loading
    textEl.style.display = 'inline';
    loadingEl.style.display = 'none';
    btn.disabled = false;

    // Flash green on the macro fields
    ['dish-kcal', 'dish-carbs', 'dish-protein', 'dish-fat'].forEach(id => {
        const el = document.getElementById(id);
        el.style.borderColor = '#10b981';
        el.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.2)';
        setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 2500);
    });

    // Show result feedback
    let msg = `🧮 Macros calculados: ${matched} ingrediente(s) reconocido(s).`;
    if (unmatched.length > 0) {
        msg += `\n⚠️ No reconocidos (estimación parcial): ${unmatched.join(', ')}`;
    }
    // Use a brief toast
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: ${unmatched.length > 0 ? '#f59e0b' : '#10b981'}; color: white; padding: 12px 24px;
        border-radius: 12px; font-size: 0.9rem; z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        white-space: pre-line; max-width: 90%;`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
};
