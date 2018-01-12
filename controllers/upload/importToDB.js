'use strict'
const asyncLoop = require('node-async-loop');
const models = require('../../models');

function importCurves(curves, idDataset, cb) {
    if(!curves || curves.length <= 0) return cb();
    let output = [];
    asyncLoop(curves, function (curveData, nextCurve) {
        curveData.idDataset = idDataset;
        models.Curve.create(curveData
        ).then((curve) => {
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
            let arr = ['username', 'datasets', 'name', 'username'];
            for(let header in wellData){
                if(!arr.includes(header) && wellData[header])
                    models.WellHeader.create({
                        idWell: well.idWell,
                        header: header,
                        value: wellData[header]
                    }).catch(err => {
                        console.log(err)
                    })
            }
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
            // logging: console.log
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

function importToDB(inputWells, userInfor, cb) {
    console.log('importToDB inputWell: ' + JSON.stringify(inputWells));
    if(!inputWells || inputWells.length <= 0) return cb('there is no well to import');
    let res = [];
    asyncLoop(inputWells, (inputWell, nextWell) => {
        inputWell.username = userInfor.username;
        models.Well.findById(inputWell.idWell)
            .then(well => {
                if(!well) {
                    importWell(inputWell, (err, wellCreated) => {
                        if(err) nextWell(err);
                        else importDatasets(inputWell.datasets, wellCreated.idWell, (err, result) => {
                            if(err) nextWell(err);
                            else {
                                wellCreated = wellCreated.toJSON();
                                wellCreated.datasets = result;
                                res.push(wellCreated);
                                nextWell();
                            }
                        })
                    })
                }
                else {
                    importDatasets(inputWell.datasets, well.idWell, (err, result) => {
                        if(err) nextWell(err);
                        else {
                            well = well.toJSON();
                            well.datasets = result;
                            res.push(well);
                            nextWell();
                        }
                    })
                }
            })
            .catch(err => {
                console.log(err)
                nextWell(err);
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
    }, (err) => {
        if(err){
            console.log(err);
            cb(err);
        }
        else {
            cb(null, res);
        }
    })

}

module.exports = importToDB;