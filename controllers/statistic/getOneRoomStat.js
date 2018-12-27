const chalk = require('chalk');
const postgres = require('../../dataBase/index').getInstance();

/**
 * This method takes last statistic by one room in database
 * @returns {Promise<{id: *, room_temp: *, heater_status: *, auto_mode: *, temp: *, deviceip: *, isalive: *, humidity: *}>}
 */
module.exports = async (roomId) => {
    try {
        const RoomStatistics = postgres.getModel('RoomStatistics');
        const HumidityInfo = postgres.getModel('HumidityInfo');
        const RoomsInfo = postgres.getModel('RoomInfo');
        const room = await RoomsInfo.findByPk(roomId);
        if (!room) throw new Error('Sorry. We have not rooms in database. Code: 5');
        const {roomid, temp, deviceip, isalive, auto_mode} = room.dataValues;
        const temperatureInfo = await RoomStatistics.findOne({
            order: [['id', 'DESC']],
            where: {
                roomid
            },
        });
        const humidityInfo = await HumidityInfo.findOne({
            order: [['id', 'DESC']],
            where: {
                roomid
            },
        });

        // if (!statisticByRoom) throw new Error(`Statistic by room ${roomid} is empty. Code 3`);
        let {roomid: id, heater_status, room_temp} = temperatureInfo.dataValues;
        let {humidity} = humidityInfo.dataValues;
        let respObj = {id, room_temp, heater_status, auto_mode, temp, deviceip, isalive, humidity};

        console.log(chalk.bgRed('REQ'));
        return respObj;

    } catch (e) {
        console.log(chalk.bgRed(e.message));
    }
};