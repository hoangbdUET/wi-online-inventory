module.exports = function (sequelize, DataTypes) {
    return sequelize.define('dataset', {
        idDataset: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: 'idwell_datasetname'
        },
        numberOfSample: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        unit: {
            type: DataTypes.STRING(5),
            allowNull: false,
            defaultValue: 'M'
        },
        top: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            defaultValue: 0
        },
        bottom: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            defaultValue: 0
        },
        step: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            defaultValue: 0
        }
    });
}