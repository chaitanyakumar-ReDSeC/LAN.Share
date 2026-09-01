// UI State & DOM Controller
const statusEl = document.getElementById('connection-status');
const cardsContainer = document.getElementById('device-cards-container');
const viewerModal = document.getElementById('viewer-modal');

window.updateConnectionUI = function(isConnected) {
    if (isConnected) {
        statusEl.textContent = "ONLINE";
        statusEl.className = "status-badge status-online";
    } else {
        statusEl.textContent = "OFFLINE";
        statusEl.className = "status-badge";
    }
};

window.toggleSharingUI = function(isBroadcasting) {
    const startBtn = document.getElementById('btn-start-share');
    const stopBtn = document.getElementById('btn-stop-share');
    if (isBroadcasting) {
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
    } else {
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
    }
};

window.renderDeviceCards = function(streams) {
    cardsContainer.innerHTML = '';
    const activeKeys = Object.keys(streams).filter(id => id !== socket.id);
    if (activeKeys.length === 0) {
        window.renderNoDevicesPlaceholder();
    } else {
        activeKeys.forEach(id => window.addDeviceCard(id, streams[id]));
    }
};

window.addDeviceCard = function(id, name) {
    const noDev = document.getElementById('no-devices');
    if (noDev) noDev.remove();
    if (document.getElementById(`card-${id}`)) return;

    const card = document.createElement('div');
    card.id = `card-${id}`;
    card.className = "feed-card";
    card.innerHTML = `
        <div>
            <div style="font-weight: bold; font-size: 0.9rem;">${name}</div>
            <div style="font-family: monospace; font-size: 0.75rem; color: #dc2626;">ID: ${id.substring(0, 8)}...</div>
        </div>
        <button onclick="connectToStream('${id}', '${name}')" class="btn feed-btn">Watch Feed</button>
    `;
    cardsContainer.appendChild(card);
};

window.removeDeviceCard = function(id) {
    const card = document.getElementById(`card-${id}`);
    if (card) card.remove();
    if (cardsContainer.children.length === 0) {
        window.renderNoDevicesPlaceholder();
    }
};

window.renderNoDevicesPlaceholder = function() {
    cardsContainer.innerHTML = `
        <div id="no-devices" class="no-feeds">NO ACTIVE FEEDS DETECTED ON NETWORK.</div>
    `;
};

window.openVideoViewer = function(name) {
    document.getElementById('active-stream-title').textContent = `LIVE FEED: ${name}`;
    viewerModal.style.display = 'flex';
};

window.closeVideoViewerUI = function() {
    viewerModal.style.display = 'none';
};

// Fullscreen Control Logic - Targets video directly to fix aspect constraints
window.toggleFullScreen = function() {
    const remoteVideo = document.getElementById('remote-video');

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (remoteVideo.requestFullscreen) {
            remoteVideo.requestFullscreen();
        } else if (remoteVideo.webkitRequestFullscreen) {
            remoteVideo.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
};

// Double-click on video to toggle fullscreen directly
document.getElementById('remote-video').addEventListener('dblclick', () => {
    window.toggleFullScreen();
});

// Keyboard shortcut: Press 'F' to toggle fullscreen while watching
document.addEventListener('keydown', (e) => {
    const viewerModal = document.getElementById('viewer-modal');
    if (viewerModal.style.display === 'flex' && (e.key === 'f' || e.key === 'F')) {
        window.toggleFullScreen();
    }
});