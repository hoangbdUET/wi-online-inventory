module.exports = function (sequelize, DataTypes) {
    return sequelize.define('well_header', {
        idWell: {
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        header: {
            type: DataTypes.STRING,
            primaryKey: true
        },
        value: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: ''
        },
        standard: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    });
}