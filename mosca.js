const mosca = require('mosca');

function start() {
    const mongoDbUrl = 'mongodb://localhost:27017/mqtt';
    const mqttPort = 1883;
    const wsPort = 8888;

    const moscaSettings = {
        port: mqttPort,
        backend: {
            type: 'mongo',
            url: mongoDbUrl,
            pubsubCollection: 'ascoltatori',
            mongo: {}
        },
        http: {
            port: wsPort,
            bundle: true,
            static: './'
        }
    };

    const server = new mosca.Server(moscaSettings);

    // Client connects
    server.on('clientConnected', (client) => {
        console.log(`Client "${client.id}" connected.`);
    });

    // Client disconnects
    server.on('clientDisconnected', (client) => {
    });

    // Message recieved
    server.on('published', (packet, client) => {
    });

    // Server started
    server.on('ready', () => {
        console.log(`Mosca server running with MQTT on port ${mqttPort} and WebSockets on port ${wsPort}.`);
    });

    return server;
};

const server = start();