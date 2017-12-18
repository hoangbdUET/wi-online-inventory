'use strict';
const asyncLoop = require('node-async-loop');
const models = require('../../models');
// const asciiExtractor = require('../../import-module/source/extractors/ascii/ascii-extractor');
const asciiExtractor = require('../../import-module').extractAscii;
const Sequelize = require('sequelize');

function importCurves(curves, idDataset, cb) {
    asyncLoop(curves, function (curve, next) {
        if(curve) {
            models.Curve.create({
                name: curve.name,
                // idWell: curve.idWell,
                unit: curve.unit,
                path: curve.path,
                idDataset: idDataset
            }).then(() => {
                next();
            }).catch(err => {
                console.log(err);
                next(err);
            });
        }

    }, (err) => {
        if(err) cb(err);
        else cb();
    })
}

function importWell(well, cb) {
    models.Well.create(well)
        .then( well => {
            cb(null, well);
        })
        .catch(err => {
            if(err.name = 'SequelizeUniqueConstraintError'){
                well.name = well.name + '_1';
                importWell(well, cb);
            }
            else {
                cb(err);
            }
        })
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
        inputWell.dataset.idWell = well.idWell;
        models.Dataset.findOrCreate({
            where : { idDataset : inputWell.dataset.idDataset },
            defaults: inputWell.dataset,
            logging: console.log
        }).spread((dataset, created) => {
            importCurves(inputWell.dataset.curves, dataset.idDataset, (err)=> {
                if(err) cb(err);
                else cb(null, well);
            })
        }).catch(err => {
            console.log(err);
        })

    }).catch(err => {
        console.log(err);
        inputWell.name = inputWell.name + '_1';
        importWell(inputWell, (err, well) => {
            if(err) return cb(err);
            inputWell.dataset.idWell = well.idWell
            models.Dataset.create(inputWell.dataset).then(dataset => {
                importCurves(inputWell.dataset.curves, dataset.idDataset, (err)=> {
                    if(err) cb(err);
                    else cb(null, well);
                })
            }).catch(err => {
                if(err) {
                    console.log(err);
                    cb(err);
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

function processFileUpload(file, importData, cb) {
    console.log('___processFileUpload: ' + JSON.stringify(importData));
    asciiExtractor.extractCurves(file, importData, (err, result) => {
        // console.log(JSON.stringify(result));
        if(err) cb(err);
        else {
            importToDB(result, importData.userInfo, (err, result) => {
                cb(err, result);
            })
        }
    })
}

function uploadAsciiFiles(req, cb) {
    if(!req.files) return cb('NO FILE CHOSEN!!!');
    let output = [];
    let importData = {};
    console.log('uploadAsciiFiles: ' + JSON.stringify(req.body));

    //req.body.createNewWell
    //req.body.createNewDataset
    //req.body.idWell           => importData.well
    //req.body.idDataset        => importData.dataset
    //req.body.columnFormat = 1/2/3/4
    //req.body.curveNameStartAt
    //req.body.curveUnitStartAt
    //req.body.curveDataStartAt
    //req.body.userInfo.username

    importData.userInfo = req.decoded;
    importData.columnFormat = req.body.columnFormat;
    importData.curveNameStartAt = req.body.curveNameStartAt;
    importData.curveUnitStartAt = req.body.curveUnitStartAt;
    importData.curveDataStartAt = req.body.curveDataStartAt;

    let promise = new Promise(function (resolve, reject) {
        if(req.body.createNewWell == 'true'){
            resolve();
        }
        else if(req.body.createNewDataset == 'true') {
            models.Well.findById(req.body.idWell)
                .then(well => { resolve(well); })
                .catch((err) => { reject(err); })
        }
        else {
            models.Well.findById(req.body.idWell, {
                    include: {
                        model: models.Dataset,
                        // attributes: [],
                        where: {idDataset: req.body.idDataset},
                        required: true
                    }
                }
            ).then(well => { resolve(well); })
                .catch((err) => { reject(err); })
        }
    })

    promise.then(well => {
        console.log(well)
        if(well) {
            importData.well = well.toJSON();
            if(well.datasets && well.datasets.length > 0) importData.dataset = well.datasets[0].toJSON();
        }
        asyncLoop(req.files, (file, nextFile) => {
            processFileUpload(file, importData, (err, result) => {
                if(err) nextFile(err);
                else {
                    output.push(result);
                    nextFile();
                }
            });
        }, (err) => {
            if(err) cb(err, null);
            else cb(null, output);
        })
    })
        .catch((err) => {
            console.log('catch: ' + err);
        })
}

module.exports = {
    uploadAsciiFiles: uploadAsciiFiles
};