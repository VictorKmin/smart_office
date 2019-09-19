const chalk = require('chalk');

const postgres = require('../dataBase').getInstance();
const {co2Service, humidityService} = require('../service');
const {currentDateBuilder} = require('../helpers');

module.exports = async body => {
    const RoomInfo = postgres.getModel('RoomInfo');
    const RoomStatistics = postgres.getModel('RoomStatistics');

    const {ip: deviceip, room_id: roomid, room_temp} = body;
    const {room_heater: status, sensor_temp: temp, sensor_humidity: humidity, sensor_co2: co2 = 0} = body.interface;

    const date = currentDateBuilder();
    const time = new Date().toLocaleTimeString();

    if (!deviceip) throw new Error(chalk.bgRed(`BAD JSON FROM MODULE ${roomid}. Code: 4 IP`));
    if (!roomid) throw new Error(chalk.bgRed(`BAD JSON FROM MODULE ${roomid}. Code: 4 ROOM ID`));
    if (!temp && temp !== 0) throw new Error(chalk.bgRed(`BAD JSON FROM MODULE ${roomid}. Sensor_temp is NULL Code: 4`));
    if (!humidity && humidity !== 0) throw new Error(chalk.bgRed(`BAD JSON FROM MODULE ${roomid}. Humidity is NULL Code: 4 humidity`));
    if (!co2 && co2 !== 0) throw new Error(chalk.bgRed(`BAD JSON FROM MODULE ${roomid}. CO2 is NULL Code: 4 CO2`));

    console.log(chalk.bgGreen.black(`Response form room ${roomid} is good`));

    /**
     * Check is room present in DataBase.
     * If we have not room - we insert it into DataBase
     * If room is already present, we just update parameters of room
     * @type {Model}
     */
    let isRoomInDB = await RoomInfo.findByPk(roomid);
//If we have not room - create it
    if (!isRoomInDB) {
        await RoomInfo.create({
            roomid,
            deviceip,
            lastresponse: Date.now(),
            room_temp,
            isalive: true,
            auto_mode: !!room_temp
        });

        await RoomStatistics.create({
            roomid,
            room_temp: temp.toFixed(1),
            heater_status: !!status,
            fulldate: `${date} ${time}`
        });

        await humidityService.create({roomid, humidity, fulldate: `${date} ${time}`});
        await co2Service.createCO2({roomid, co2, fulldate: `${date} ${time}`});

        console.log(chalk.blue(`Room ${roomid} is created`));
    }
// If room is present - update ip address and last response time
    await RoomInfo.update({
        deviceip,
        isalive: true,
        auto_mode: !!room_temp,
        lastresponse: Date.now()
    }, {
        where: {
            roomid
        }
    });

    /**
     * This method minimize records in DataBase
     * Get current date and time.
     * Check is previous and before the previous one records in DataBase have temperature like current value from temperature module
     * If its equals we delete previous record.
     */
        // Find newest room in DataBase
    let [previousRoom, oldRoom] = await RoomStatistics.findAll({
            order: [['id', 'DESC']],
            limit: 2,
            where: { roomid }
        });

    if (previousRoom && oldRoom) {
        const {room_temp: oldTemp} = oldRoom.dataValues;
        const {id: lastId, room_temp: lastTemp} = previousRoom.dataValues;
        // If temperatures of current value and last value is equals - just update time
        if (+oldTemp === +temp.toFixed(1) && +lastTemp === +temp.toFixed(1)) {
            await RoomStatistics.destroy({
                where: {
                    id: lastId
                }
            });
            console.log(chalk.blue(`DELETE PREVIOUS TEMPERATURE `));
        }
    }
    // Then we create new record
    await RoomStatistics.create({
        roomid,
        room_temp: temp.toFixed(1),
        heater_status: !!status,
        fulldate: `${date} ${time}`
    });

    [previousRoom, oldRoom] = await humidityService.getAllInfoByParams(
        { roomid },
        'id',
        'DESC',
        2
    );

    if (previousRoom && oldRoom) {
        const {humidity: oldHumidity} = oldRoom.dataValues;
        const {id: lastId, humidity: lastHumidity} = previousRoom.dataValues;
        // If humidity of current value and last value is equals - just update time
        if (+oldHumidity === +humidity.toFixed(1) && +lastHumidity === +humidity.toFixed(1)) {
            await humidityService.destroyByParams({ id: lastId });
            console.log(chalk.blue(`DELETE PREVIOUS HUMIDITY`));
        }
    }
    // If they are not equals - create new record
    await humidityService.create({
        roomid,
        humidity: humidity.toFixed(1),
        fulldate: `${date} ${time}`
    });

    [previousRoom, oldRoom] = await co2Service.getAllInfoByParams({roomid}, 'id', 'DESC', 2);

    if (previousRoom && oldRoom) {
        const {co2: oldCO2} = oldRoom.dataValues;
        const {id: lastId, co2: lastCO2} = previousRoom.dataValues;
        // If co2 of current value and last value is equals - destroy average record
        if (+oldCO2 === +co2.toFixed(1) && +lastCO2 === +co2.toFixed(1)) {

            await co2Service.destroyCO2({id: lastId});

            console.log(chalk.blue(`DELETE PREVIOUS CO2`));
        }
    }
    // If they are not equals - create new record
    await co2Service.createCO2({
        roomid,
        co2: co2.toFixed(1),
        fulldate: `${date} ${time}`
    });

    console.log(chalk.blue(`Info by room ${roomid} insert into statistic`));

};
