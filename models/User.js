module.exports = function (sequelize, DataTypes) {
    return sequelize.define('user', {
        username: {
            type: DataTypes.STRING(100),
            allowNull: false,
            primaryKey: true
        },
        password: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        islogin: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        },
        role: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        }
    });
}