module.exports = function (sequelize, DataTypes) {
    return sequelize.define('well_parameter', {
        idWell: {
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        parameter: {
            type: DataTypes.STRING,
            primaryKey: true
        },
        value: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: ''
        },
        description: {
            type: DataTypes.STRING,
            defaultValue: ''
        }
    });
}