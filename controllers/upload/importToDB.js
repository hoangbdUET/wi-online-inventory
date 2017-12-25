'use strict'
const asyncLoop = require('node-async-loop');
const models = require('../../models');

function importCurves(curves, idDataset, cb) {
    if(!curves || curves.length <= 0) return cb();
    let output = [];
    asyncLoop(curves, function (curveData, nextCurve) {
        models.Curve.create({
            name: curveData.name,
            unit: curveData.unit,
            path: curveData.path,
            idDataset: idDataset
        }).then((curve) => {
            output.push(curve);
            nextCurve();
        }).catch(err => {
            console.log(err);
            nextCurve(err);
        });

    }, (err) => {
        if(err) cb(err);
        else cb(null, output);
    })
}

function importWell(wellData, cb) {
    models.Well.create(wellData)
        .then( well => {
            cb(null, well);
        })
        .catch(err => {
            if(err.name = 'SequelizeUniqueConstraintError'){
                wellData.name = wellData.name + '_1';
                importWell(wellData, cb);
            }
            else {
                cb(err);
            }
        })
}

function importDatasets(datasets, idWell, cb) {
    if (!datasets || datasets.length <= 0) return cb();
    let output = [];
    asyncLoop(datasets, (datasetData, next) => {
        datasetData.idWell = idWell;
        models.Dataset.findOrCreate({
            where : { idDataset : datasetData.idDataset },
            defaults: datasetData,
            logging: console.log
        }).spread((dataset, created) => {
            importCurves(datasetData.curves, dataset.idDataset, (err, result)=> {
                if(err) next(err);
                else {
                    dataset = dataset.toJSON();
                    dataset.curves = result;
                    output.push(dataset);
                    next();
                }
            })
        }).catch(err => {
            console.log(err);
            next(err);
        })
    }, (err => {
        if(err) cb(err);
        else cb(null, output);
    }))
}

function importToDB(inputWell, userInfor, cb) {
    console.log('importToDB inputWell: ' + JSON.stringify(inputWell));
    inputWell.username = userInfor.username;
    models.Well.findOrCreate({
        where : { idWell : inputWell.idWell },
        defaults: inputWell,
        logging: console.log
    }).spread((well, created) => {
        console.log('create new well? ' + created);
        importDatasets(inputWell.datasets, well.idWell, (err, result) => {
            if(err) cb(err);
            else {
                well = well.toJSON();
                well.datasets = result;
                cb(null, well);
            }
        })
    }).catch(err => {
        console.log(err);
        inputWell.name = inputWell.name + '_1';
        importWell(inputWell, (err, well) => {
            if(err) return cb(err);
            importDatasets(inputWell.datasets, well.idWell, (err, result) => {
                if(err) cb(err);
                else {
                    well = well.toJSON();
                    well.datasets = result;
                    cb(null, well);
                }
            })
        })

        //delete extracted curve files if import to db failed
        // if(inputWell.datasetInfo && inputWell.datasetInfo.length > 0) {
        //     asyncLoop(inputWell.datasetInfo, (dataset, nextDataset) => {
        //         curveModel.deleteCurveFiles(dataset.curves);
        //         nextDataset();
        //     }, (err) => {
        //         console.log('done deleting: ' + err);
        //     })
        // }
    })
}

module.exports = importToDB;