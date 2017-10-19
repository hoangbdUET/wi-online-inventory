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
    'Well'
];
models.forEach(function (model) {
    module.exports[model] = sequelize.import(__dirname + '/' + model);
});

(function (m) {
    m.Well.hasMany(m.Curve, {
        foreignKey: {name: "idWell", allowNull: false, unique: "name-idWell"},
        onDelete: 'CASCADE'
    });
})(module.exports);
module.exports.sequelize = sequelize;