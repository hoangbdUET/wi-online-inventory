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
        filename : {
            type: DataTypes.STRING(100),
            allowNull: true
        }
    });
}