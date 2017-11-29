module.exports = function (sequelize, DataTypes) {
    return sequelize.define('well', {
        idWell: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
            unique: 'wellname-username'
        },
        start: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            defaultValue: 0
        },
        stop: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            defaultValue: 0
        },
        step: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            defaultValue: 0
        },
        UWI: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        API: {
            type: DataTypes.STRING(100),
            allowNull: true
        }
    });
}