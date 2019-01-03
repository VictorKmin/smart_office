const chalk = require('chalk');
const postgres = require('../../dataBase/index').getInstance();

/**
 * This method takes last statistic by all rooms in database
 * @returns {Promise<Array>}
 */
module.exports = async () => {
    try {
        console.log(chalk.bgRed('FULL STAT START'))
        const RoomStatistics = postgres.getModel('RoomStatistics');
        const HumidityInfo = postgres.getModel('HumidityInfo');
        const RoomsInfo = postgres.getModel('RoomInfo');
        // Achtung Achtung Achtung
        //
        let resp = [];
        const allRooms = await RoomsInfo.findAll({});
        if (!allRooms.length) throw new Error('Sorry. We have not rooms in database. Code: 5');
        for (const room of allRooms) {
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

            let {roomid: id, heater_status, room_temp} = temperatureInfo.dataValues;
            let {humidity} = humidityInfo.dataValues;
            let respObj = {id, room_temp, heater_status, auto_mode, temp, deviceip, isalive, humidity};
            resp.push(respObj);

            resp.sort((first, second) => {
                return first.id - second.id
            })
        }
        console.log(chalk.bgRed('FULL STAT END'))

        return resp;

    } catch (e) {
        console.log(chalk.bgRed(e.message));

        return e;
    }
};