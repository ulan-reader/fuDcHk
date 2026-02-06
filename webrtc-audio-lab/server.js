import express from "express";
import http from "http";
import { Server } from "socket.io";
import mediasoup from "mediasoup";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",          // любой origin (включая разные порты)
        methods: ["GET", "POST"]
    }
});


app.use(express.static("public"));

let worker;
let router;

(async () => {
    worker = await mediasoup.createWorker();
    router = await worker.createRouter({
        mediaCodecs: [
            {
                kind: "audio",
                mimeType: "audio/opus",
                clockRate: 48000,
                channels: 2
            }
        ]
    });
})();

// ... (твой импорт и создание worker/router остаются)

io.on("connection", socket => {
    console.log("Client connected:", socket.id);

    socket.on("getRtpCapabilities", (_, cb) => {
        cb(router.rtpCapabilities);
    });

    socket.on("createTransport", async (_, cb) => {
        try {
            const transport = await router.createWebRtcTransport({
                listenIps: [{ ip: "127.0.0.1", announcedIp: null }],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true,
            });

            socket.data.transport = transport; // лучше socket.data, чем socket.transport

            cb({
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
            });
        } catch (err) {
            console.error("createTransport error", err);
            cb({ error: err.message });
        }
    });

    socket.on("connectTransport", async ({ dtlsParameters }, cb) => {
        try {
            await socket.data.transport.connect({ dtlsParameters });
            cb({});
        } catch (err) {
            console.error("connectTransport error", err);
            cb({ error: err.message });
        }
    });

    socket.on("produce", async ({ kind, rtpParameters }, cb) => {
        try {
            const producer = await socket.data.transport.produce({ kind, rtpParameters });
            console.log(`🎙 Producer created: ${producer.id} (${kind})`);
            cb({ id: producer.id });
            // После создания producer (внутри "produce" handler или отдельно)
            const plainTransport = await router.createPlainTransport({
                listenIp: '127.0.0.1',          // или '0.0.0.0' если Rust на другой машине
                rtcpMux: false,                 // для простоты, RTCP отдельно
                comedia: false                   // mediasoup сам узнает IP/port по первому пакету (удобно для теста)
            });

            await plainTransport.connect({
                ip: '127.0.0.1',
                port: 57353,        // любой порт, который ты слушаешь
                rtcpPort: 35668     // если rtcpMux: false
            });

            console.log('PlainTransport created:');
            console.log('  RTP port:', plainTransport.tuple.localPort);
            console.log('  RTCP port:', plainTransport.rtcpTuple?.localPort);

// Consume producer → отправляем RTP наружу по UDP
            const consumer = await plainTransport.consume({
                producerId: producer.id,        // ID producer'а из события produce
                rtpCapabilities: router.rtpCapabilities,  // или свои, если нужно
                paused: false
            });

            console.log('Consumer created for PlainTransport, RTP летит на порт', plainTransport.tuple.localPort);


        } catch (err) {
            console.error("produce error", err);
            cb({ error: err.message });
        }
    });

    socket.on("disconnect", () => {
        if (socket.data.transport) {
            socket.data.transport.close();
        }
        console.log("Client disconnected:", socket.id);
    });
});

server.listen(3000, () =>
    console.log("🚀 server on http://localhost:3000")
);
