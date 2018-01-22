module.exports = function (sequelize, DataTypes) {
    return sequelize.define('curve', {
        idCurve: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "",
            unique: "iddataset_curvename"
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
        description: {
            type: DataTypes.STRING,
            defaultValue: ''
        }
    });
}