import dgram from 'dgram';

const server = dgram.createSocket('udp4');

server.on('message', (msg, rinfo) => {
    console.log(`Получен RTP-пакет ${msg.length} байт от ${rinfo.address}:${rinfo.port}`);
    console.log('RTP header (hex):', msg.slice(0, 12).toString('hex'));
});

server.on('listening', () => {
    const address = server.address();
    console.log(`UDP-тест слушает ${address.address}:${address.port}`);
});

server.bind(26238, '127.0.0.1');