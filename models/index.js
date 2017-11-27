"use strict";
let Sequelize = require('sequelize');
var config = require('config').Database;

const sequelize = new Sequelize(config.dbName, config.user, config.password, {
    define: {
        freezeTableName: true
    },
    dialect: config.dialect,
    port: config.port,
    logging: config.logging,
    dialectOptions: {
        charset: 'utf8'
    },
    pool: {
        max: 2,
        min: 0,
        idle: 200
    },
    operatorsAliases: Sequelize.Op
    // storage: config.storage
});
sequelize.sync()
    .catch(function (err) {
        console.log(err);
    });
var models = [
    'Curve',
    'Well',
    'User',
    'File'
];
models.forEach(function (model) {
    module.exports[model] = sequelize.import(__dirname + '/' + model);
});

(function (m) {
    m.User.hasMany(m.File, {
        foreignKey: {name: "idUser", allowNull: false, unique: "name-idUser"},
        onDelete: 'CASCADE'
    });
    m.File.belongsTo(m.User, {
        foreignKey: {name: "idUser", allowNull: false}
    });

    m.File.hasMany(m.Well, {
        foreignKey: {name: "idFile", allowNull: false, unique: "name-idFile"},
        onDelete: 'CASCADE'
    });

    m.Well.belongsTo(m.File, {
        foreignKey: {name: "idFile", allowNull: false}
    });

    m.Well.hasMany(m.Curve, {
        foreignKey: {name: "idWell", allowNull: false, unique: "name-idWell"},
        onDelete: 'CASCADE'
    });

    m.Curve.belongsTo(m.Well, {
        foreignKey: {name: "idWell", allowNull: false}
    })
})(module.exports);
module.exports.sequelize = sequelize;