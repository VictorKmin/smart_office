const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const {fork} = require('child_process');
const bodyParser = require('body-parser');
const {resolve: resolvePath} = require('path');
const mainController = require('./router/main');
// const cron = require('node-cron');
// const clearDatabase = require('./helpers/clearDatabase');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const getRooms = require('./controllers/statistic/lastRoomStat');
const getFullStat = require('./controllers/statistic/fullStatisticByDate');
const changeRoomTemp = require('./controllers/temperature/setTemperature');
const getOneRoomStat = require('./controllers/statistic/getOneRoomStat');
const base = require('./controllers/dataBaseController');

let s;

io.on("connection", socket => {
    s = socket;
    socket.on('getRoom', async () => {
        socket.emit('rooms', await getRooms())
    });

    socket.on('buildChart', async body => {
        socket.emit('charts', await getFullStat(body))
    });

    socket.on('changeTemp', async body => {
        changeRoomTemp(body.roomId, body.temp)
            .then(async value => {
                await base(JSON.parse(value))
            })
            .then(() => {
                return getOneRoomStat(body.roomId)
            })
            .then(value => {
                socket.emit('oneRoom', value);
            })
    });
});
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");

    req.socket = s;
    next();
});

app.use('/', mainController);

/**
 * Child-process to working with Modules
 * Sending request to check temperature in room;
 * Check is our module is alive
 */
(() => {
    console.log('Start modules');
    const isModuleAlive = fork(resolvePath('./microservices/checkModules'));
    // const sendTempRequest = fork(resolvePath('./microservices/sendTempRequest'));
    isModuleAlive.send('startCheck');
    // sendTempRequest.send('sendReq');
})();

/**
 * This method clear old records in statistics table
 * Method running once time
 * "Old records" is records who older than 1 month
 */
// cron.schedule('0 0 1 * *', () => {
//     clearDatabase(postgres)
// });

http.listen(5000, (err) => {
    if (err) console.log(err);
    else {
        console.log('Listen 5000');
        console.log(` _ _ _ ___ _   __ _  _   _ ___   ___ _    __ _   _  _  ___ ___    _  ___ ___ _  __ ___ 
| | | | __| | / _/ \\| \\_/ | __| |_ _/ \\  / _| \\_/ |/ \\| o |_ _|  / \\| __| __| |/ _| __|
| V V | _|| |( (( o | \\_/ | _|   | ( o ) \\_ | \\_/ | o |   /| |  ( o | _|| _|| ( (_| _| 
 \\_n_/|___|___\\__\\_/|_| |_|___|  |_|\\_/  |__|_| |_|_n_|_|\\\\|_|   \\_/|_| |_| |_|\\__|___|
                                                                                       `);
    }
});