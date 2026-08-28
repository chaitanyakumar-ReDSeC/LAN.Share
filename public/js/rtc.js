// WebRTC & Socket Signaling Controller for LANshare
const socket = io();
let localStream = null;
let peerConnection = null;
let currentTargetId = null;

const rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// Listen for connection states
socket.on('connect', () => {
    updateConnectionUI(true);
});

socket.on('disconnect', () => {
    updateConnectionUI(false);
});

// Broadcast Stream List Updates
socket.on('active-streams', (streams) => {
    renderDeviceCards(streams);
});

socket.on('stream-added', ({ id, name }) => {
    if (id === socket.id) return;
    addDeviceCard(id, name);
});

socket.on('stream-removed', (id) => {
    removeDeviceCard(id);
});

// --- WebRTC Broadcaster Logic ---
async function startSharing() {
    const labelInput = document.getElementById('device-name').value.trim();
    try {
        localStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        
        toggleSharingUI(true);
        socket.emit('start-share', labelInput);

        // Track when browser's native "Stop Sharing" floating bar is clicked
        localStream.getVideoTracks()[0].onended = () => stopSharing();
    } catch (err) {
        console.error("Screen capture permission denied or failed:", err);
    }
}

function stopSharing() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    toggleSharingUI(false);
    socket.emit('stop-share');
}

// --- WebRTC Receiver & Connection Handshake ---
async function connectToStream(targetId, name) {
    currentTargetId = targetId;
    openVideoViewer(name);

    peerConnection = new RTCPeerConnection(rtcConfig);

    peerConnection.ontrack = (event) => {
        const remoteVideo = document.getElementById('remote-video');
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { target: currentTargetId, candidate: event.candidate });
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { target: currentTargetId, offer });
}

// WebRTC Handshake Signalling
socket.on('offer', async ({ sender, offer }) => {
    peerConnection = new RTCPeerConnection(rtcConfig);

    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { target: sender, candidate: event.candidate });
        }
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit('answer', { target: sender, answer });
});

socket.on('answer', async ({ answer }) => {
    if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
});

socket.on('ice-candidate', async ({ candidate }) => {
    if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
});

function closeViewer() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    const remoteVideo = document.getElementById('remote-video');
    if (remoteVideo) remoteVideo.srcObject = null;
    closeVideoViewerUI();
}