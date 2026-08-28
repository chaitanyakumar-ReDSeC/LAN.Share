// UI Helper Logic
const statusEl = document.getElementById('connection-status');
const cardsContainer = document.getElementById('device-cards-container');
const viewerModal = document.getElementById('viewer-modal');

function updateConnectionUI(isConnected) {
    if (isConnected) {
        statusEl.textContent = "ONLINE";
        statusEl.className = "text-xs font-mono uppercase px-3 py-1 bg-red-600/10 border border-red-600 text-red-500 rounded font-bold";
    } else {
        statusEl.textContent = "OFFLINE";
        statusEl.className = "text-xs font-mono uppercase px-3 py-1 bg-neutral-900 border border-neutral-700 text-neutral-400 rounded";
    }
}

function toggleSharingUI(isBroadcasting) {
    const startBtn = document.getElementById('btn-start-share');
    const stopBtn = document.getElementById('btn-stop-share');
    if (isBroadcasting) {
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
    } else {
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
    }
}

function renderDeviceCards(streams) {
    cardsContainer.innerHTML = '';
    const activeKeys = Object.keys(streams).filter(id => id !== socket.id);
    if (activeKeys.length === 0) {
        renderNoDevicesPlaceholder();
    } else {
        activeKeys.forEach(id => addDeviceCard(id, streams[id]));
    }
}

function addDeviceCard(id, name) {
    const noDev = document.getElementById('no-devices');
    if (noDev) noDev.remove();

    if (document.getElementById(`card-${id}`)) return;

    const card = document.createElement('div');
    card.id = `card-${id}`;
    card.className = "p-4 bg-black border border-neutral-800 rounded flex justify-between items-center hover:border-red-600 transition";
    card.innerHTML = `
        <div>
            <p class="font-bold text-white text-sm">${name}</p>
            <p class="text-xs text-neutral-500 font-mono">ID: ${id.substring(0, 8)}...</p>
        </div>
        <button onclick="connectToStream('${id}', '${name}')" class="px-4 py-2 bg-white text-black hover:bg-red-600 hover:text-white font-bold text-xs uppercase tracking-wider rounded transition">
            Watch Feed
        </button>
    `;
    cardsContainer.appendChild(card);
}

function removeDeviceCard(id) {
    const card = document.getElementById(`card-${id}`);
    if (card) card.remove();
    if (cardsContainer.children.length === 0) {
        renderNoDevicesPlaceholder();
    }
}

function renderNoDevicesPlaceholder() {
    cardsContainer.innerHTML = `
        <div id="no-devices" class="text-neutral-600 text-center py-8 border border-dashed border-neutral-800 rounded text-sm font-mono">
            NO ACTIVE FEEDS DETECTED ON NETWORK.
        </div>
    `;
}

function openVideoViewer(name) {
    document.getElementById('active-stream-title').textContent = `LIVE FEED: ${name}`;
    viewerModal.classList.remove('hidden');
    viewerModal.classList.add('flex');
}

function closeVideoViewerUI() {
    viewerModal.classList.add('hidden');
    viewerModal.classList.remove('flex');
}