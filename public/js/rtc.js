// rtc.js

const socket = io();
let localStream = null;
let peerConnection = null;
let currentTargetId = null;
let canvasInterval = null;

const rtcConfig = { iceServers: [] };

socket.on('connect', () => window.updateConnectionUI(true));
socket.on('disconnect', () => window.updateConnectionUI(false));
socket.on('active-streams', (streams) => window.renderDeviceCards(streams));

socket.on('stream-added', ({ id, name }) => {
    if (id === socket.id) return;
    window.addDeviceCard(id, name);
});

socket.on('stream-removed', (id) => window.removeDeviceCard(id));

async function startSharing() {
    const labelInput = document.getElementById('device-name').value.trim() || 'Host Device';
    try {
        // High-Quality WebRTC Display Constraints (1080p ideal target @ 60 FPS)
        localStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: {
                width: { ideal: 1920, max: 1920 },
                height: { ideal: 1080, max: 1080 },
                frameRate: { ideal: 60, max: 60 }
            }, 
            audio: false 
        });

        window.toggleSharingUI(true);
        socket.emit('start-share', labelInput);
        
        // Canvas frame fallback stream loop
        const videoTrack = localStream.getVideoTracks()[0];
        const v = document.createElement('video');
        v.srcObject = localStream;
        v.play();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvasInterval = setInterval(() => {
            if (v.videoWidth > 0) {
                canvas.width = v.videoWidth / 2;
                canvas.height = v.videoHeight / 2;
                ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                const frameData = canvas.toDataURL('image/jpeg', 0.5);
                socket.emit('stream-frame', frameData);
            }
        }, 100);

        videoTrack.onended = () => stopSharing();
    } catch (err) {
        console.error("Screen capture failed:", err);
    }
}

function stopSharing() {
    if (canvasInterval) clearInterval(canvasInterval);
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    window.toggleSharingUI(false);
    socket.emit('stop-share');
}

window.connectToStream = async function(targetId, name) {
    currentTargetId = targetId;
    window.openVideoViewer(name);

    if (peerConnection) peerConnection.close();
    peerConnection = new RTCPeerConnection(rtcConfig);

    peerConnection.ontrack = (event) => {
        const remoteVideo = document.getElementById('remote-video');
        if (remoteVideo && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.play().catch(e => console.log(e));
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { target: currentTargetId, candidate: event.candidate });
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { target: currentTargetId, offer });
};

// Fallback Frame Receiver over WebSocket
socket.on('stream-frame', (frameData) => {
    const remoteVideo = document.getElementById('remote-video');
    if (remoteVideo) {
        remoteVideo.poster = frameData;
    }
});

socket.on('offer', async ({ sender, offer }) => {
    if (peerConnection) peerConnection.close();
    peerConnection = new RTCPeerConnection(rtcConfig);

    if (localStream) {
        localStream.getTracks().forEach(track => {
            const rtpSender = peerConnection.addTrack(track, localStream);

            // Fine-tune WebRTC sender for high bitrate local streaming (6 Mbps target)
            if (track.kind === 'video') {
                const parameters = rtpSender.getParameters();
                if (!parameters.encodings) parameters.encodings = [{}];
                parameters.encodings[0].maxBitrate = 6000000;
                rtpSender.setParameters(parameters).catch(err => console.error("Bitrate limit error:", err));
            }
        });
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

window.closeViewer = function() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    const remoteVideo = document.getElementById('remote-video');
    if (remoteVideo) {
        remoteVideo.srcObject = null;
        remoteVideo.removeAttribute('poster');
    }
    window.closeVideoViewerUI();
};