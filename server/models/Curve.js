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
        description: {
            type: DataTypes.STRING,
            defaultValue: ''
        },
        dimension: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        delimiter: {
            type: DataTypes.STRING,
            defaultValue: ' '
        },
        type: {
            type: DataTypes.ENUM("NUMBER","TEXT","ARRAY","OTHER"),
            defaultValue: 'NUMBER',
            allowNull: false
        }
    });
}