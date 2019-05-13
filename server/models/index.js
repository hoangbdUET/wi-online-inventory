"use strict";
let Sequelize = require('sequelize');
var config = require('config').Database;

const sequelize = new Sequelize(process.env.INVENTORY_DBNAME || config.dbName, process.env.INVENTORY_DBUSER || config.user, process.env.INVENTORY_DBPASSWORD || config.password, {
    define: {
        freezeTableName: true
    },
    logging: false,
    dialect: process.env.INVENTORY_DIALECT || config.dialect,
    host: process.env.INVENTORY_DBHOST || config.host || "127.0.0.1",
    port: process.env.INVENTORY_DBPORT || config.port,
    dialectOptions: {
        charset: 'utf8'
    },
    pool: {
        max: 100,
        min: 0,
        acquire: 60000
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
    'Dataset',
    'WellHeader',
    'DatasetParams',
    'CurveRevision',
    'UserWell'
];
models.forEach(function (model) {
    module.exports[model] = sequelize.import(__dirname + '/' + model);
});

(function (m) {
    m.User.hasMany(m.Well, {
        foreignKey: {name: "username", allowNull: false},
        onDelete: 'CASCADE'
    });
    m.Well.belongsTo(m.User, {
        foreignKey: {name: "username", allowNull: false, unique: "wellname-username"}
    });

    m.Well.hasMany(m.Dataset, {
        foreignKey: {name: "idWell", allowNull: false}
    });

    m.Dataset.belongsTo(m.Well, {
        foreignKey: {name: "idWell", allowNull: false, unique: "idwell_datasetname"}
    });

    m.Dataset.hasMany(m.Curve, {
        foreignKey: {name: "idDataset", allowNull: false},
        onDelete: 'CASCADE'
    });

    m.Curve.belongsTo(m.Dataset, {
        foreignKey: {name: "idDataset", allowNull: false, unique: "iddataset_curvename"}
    })

    m.Well.hasMany(m.WellHeader, {
        foreignKey: 'idWell',
        sourceKey: 'idWell',
        onDelete: 'CASCADE'
    })

    m.Curve.hasMany(m.CurveRevision, {
        foreignKey: {name: 'idCurve', allowNull: false},
        onDelete: 'CASCADE'
    })

    m.CurveRevision.belongsTo(m.Curve, {
        foreignKey: {name: 'idCurve', allowNull: false}
    })

    m.Dataset.hasMany(m.DatasetParams, {
        foreignKey: 'idDataset',
        sourceKey: 'idDataset',
        onDelete: 'CASCADE'
    })

    m.User.belongsToMany(m.Well, {
        through: {
            model: m.UserWell
        },
        foreignKey: 'idUser'
    })

    m.Well.belongsToMany(m.User, {
        through: {
            model: m.UserWell
        },
        foreignKey: 'idWell'
    })

})(module.exports);
module.exports.sequelize = sequelize;
