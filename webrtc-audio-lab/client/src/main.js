// client/main.js
import * as mediasoupClient from 'mediasoup-client';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');  // или через proxy

// используй mediasoupClient.Device напрямую
const device = new mediasoupClient.Device();
await device.load({ routerRtpCapabilities });
// let device;
let transport;
let producer;

document.getElementById('start').onclick = async () => {
    console.log('▶️ start clicked');

    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('🎙 got stream');
    } catch (e) {
        console.error('❌ mic error', e);
        return;
    }

    const track = stream.getAudioTracks()[0];
    console.log('🎧 track ready');

    const rtpCapabilities = await new Promise(res => socket.emit('getRtpCapabilities', null, res));
    console.log('📦 rtpCapabilities received');

    device = new mediasoupClient.Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    console.log('📡 device loaded, canProduce:', device.canProduce('audio'));

    // ... остальной код: createTransport, connect, produce (аналогично твоему, но без window.mediasoupClient)
    // transport = device.createSendTransport(params);
    // и т.д.
};