module.exports = function (sequelize, DataTypes) {
    return sequelize.define('curve_revision', {
        idRevision: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        path: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: ""
        },
        unit: {
            type: DataTypes.STRING,
            allowNull: false
        },
        startDepth: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 0
        },
        stopDepth: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 0
        },
        step: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 0
        },
        isCurrentRevision: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    });
}