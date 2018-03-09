module.exports = function (sequelize, DataTypes) {
    return sequelize.define('user_well', {
        idUser: {
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        idWell: {
            type: DataTypes.INTEGER,
            primaryKey: true
        },
        role: {
            type: DataTypes.STRING,
            allowNull: true
        }
    });
}