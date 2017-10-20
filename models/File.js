module.exports = function (sequelize, DataTypes) {
    return sequelize.define('file', {
        idFile: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        size: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            defaultValue: 0
        },
        type: {
            type: DataTypes.STRING(10),
            allowNull: false,
            defaultValue: 'LAS'
        }
    });
}