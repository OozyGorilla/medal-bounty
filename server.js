const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

let lobbies = {};

server.on('connection', socket => {
    socket.on('message', message => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'createLobby':
                const lobbyCode = generateLobbyCode();
                lobbies[lobbyCode] = { players: {}, fireteamSkillRank: 0 };
                socket.send(JSON.stringify({ type: 'lobbyCreated', lobbyCode }));
                break;

            case 'joinLobby':
                const { code, playerName } = data;
                if (lobbies[code]) {
                    lobbies[code].players[playerName] = { score: 0, wins: 0, losses: 0 };
                    socket.lobbyCode = code;
                    socket.playerName = playerName;
                    broadcast(code, JSON.stringify({ type: 'playerJoined', playerName, players: lobbies[code].players }));
                } else {
                    socket.send(JSON.stringify({ type: 'error', message: 'Invalid lobby code' }));
                }
                break;

            case 'spin':
                const spinData = data.spinData;
                broadcast(socket.lobbyCode, JSON.stringify({ type: 'spinResult', spinData }));
                break;

            case 'updateScore':
                const { player, points, actionType } = data;
                const lobby = lobbies[socket.lobbyCode];
                if (lobby) {
                    const playerData = lobby.players[player];
                    playerData.score = Math.max(0, playerData.score + points);
                    if (actionType === 'win') playerData.wins++;
                    if (actionType === 'loss') playerData.losses++;
                    lobby.fireteamSkillRank = Math.max(0, lobby.fireteamSkillRank + points);
                    broadcast(socket.lobbyCode, JSON.stringify({ type: 'scoreUpdated', players: lobby.players, fireteamSkillRank: lobby.fireteamSkillRank }));
                }
                break;
        }
    });

    socket.on('close', () => {
        if (socket.lobbyCode && socket.playerName) {
            const lobby = lobbies[socket.lobbyCode];
            if (lobby) {
                delete lobby.players[socket.playerName];
                broadcast(socket.lobbyCode, JSON.stringify({ type: 'playerLeft', playerName: socket.playerName, players: lobby.players }));
            }
        }
    });
});

function broadcast(lobbyCode, message) {
    server.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.lobbyCode === lobbyCode) {
            client.send(message);
        }
    });
}

function generateLobbyCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

console.log('Server started on port 8080');
