const  {DB_TABLES} = require('../../constants');

module.exports = (sequelize, DataTypes) => {
    const CO2Info = sequelize.define('CO2Info', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        room_id: {
            type: DataTypes.INTEGER
        },
        co2: {
            type: DataTypes.DOUBLE,
        },
        full_date: {
            type: DataTypes.STRING,
            defaultValue: sequelize.fn('now')
        }
    }, {
        tableName: DB_TABLES.CO2,
        timestamps: false
    });
    return CO2Info
};
