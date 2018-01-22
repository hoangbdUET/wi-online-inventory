'use strict'
const asyncLoop = require('node-async-loop');
const models = require('../../models');
const WellHeader = require('../wellHeader');

function importCurves(curves, dataset, cb) {
    if(!curves || curves.length <= 0) return cb();
    let output = [];
    asyncLoop(curves, function (curveData, nextCurve) {
        curveData.idDataset = dataset.idDataset;
        models.Curve.create(curveData
        ).then((curve) => {
            if(curveData.wellname != dataset.wellname || curveData.datasetname != dataset.name){
                const oldCurve = {
                    username: dataset.username,
                    wellname: curveData.wellname,
                    datasetname: curveData.datasetname,
                    curvename: curveData.name
                }
                const newCurve = {
                    username: dataset.username,
                    wellname: dataset.wellname,
                    datasetname: dataset.name,
                    curvename: curveData.name
                };
                const changeSet = {};
                changeSet.path = require('../fileManagement').moveCurveFile(oldCurve, newCurve);
                Object.assign(curve, changeSet);
                curve.save().then(curve=>{
                    output.push(curve);
                    nextCurve();
                }).catch(err => {
                    console.log(err);
                    nextCurve(err);
                })
            }
            else {
                output.push(curve);
                nextCurve();
            }

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
            let arr = ['username', 'datasets', 'name', 'params'];
            for(let property in WellHeader){
                let well_header = {};
                if(wellData[WellHeader[property].LASMnemnics]){
                    well_header = wellData[WellHeader[property].LASMnemnics];
                }
                else if(wellData[WellHeader[property].CSVMnemnics]){
                    well_header = wellData[WellHeader[property].CSVMnemnics];
                }
                arr.push(property);
                well_header.idWell = well.idWell;
                well_header.header = property;
                models.WellHeader.create(well_header)
                    .catch(err => {
                    console.log('=============' + err)
                })
            }

            for(let header in wellData){
                if(!arr.includes(header))
                    models.WellHeader.create({
                        idWell: well.idWell,
                        header: header,
                        value: wellData[header].value,
                        description: wellData[header].description,
                        standard: false
                    }).catch(err => {
                        console.log(err)
                    })
            }
            wellData.params.forEach(param => {
                param.idWell = well.idWell;
                models.WellParameter.create(param)
                    .catch(err => {
                        console.log('import to well_parameter failed ===> ' + err);
                    })
            })
            cb(null, well);
        })
        .catch(err => {
            console.log('===' + err + "===> It's ok, rename now")
            if(err.name = 'SequelizeUniqueConstraintError'){
                if(wellData.name.indexOf(' ( copy ') < 0){
                    wellData.name = wellData.name + ' ( copy 1 )';
                }
                else {
                    let copy = wellData.name.substr(wellData.name.lastIndexOf(' ( copy '), wellData.name.length);
                    let copyNumber = parseInt(copy.replace(' ( copy ', '').replace(' )', ''));
                    copyNumber++;
                    wellData.name = wellData.name.replace(copy, '') + ' ( copy ' + copyNumber + ' )';
                }
                importWell(wellData, cb);
            }
            else {
                cb(err);
            }
        })
}

function importDatasets(datasets, well, cb) {
    if (!datasets || datasets.length <= 0) return cb();
    let output = [];
    asyncLoop(datasets, (datasetData, next) => {
        datasetData.idWell = well.idWell;
        models.Dataset.findOrCreate({
            where : { idDataset : datasetData.idDataset },
            defaults: datasetData,
            // logging: console.log
        }).spread((dataset, created) => {
            dataset = dataset.toJSON();
            dataset.wellname = well.name;
            dataset.username = well.username;
            importCurves(datasetData.curves, dataset, (err, result)=> {
                if(err) next(err);
                else {
                    dataset.curves = result;
                    output.push(dataset);
                    next();
                }
            })
        }).catch(err => {
            console.log('import dataset failed: ' + err);
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
                        else importDatasets(inputWell.datasets, wellCreated, (err, result) => {
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
                    importDatasets(inputWell.datasets, well, (err, result) => {
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