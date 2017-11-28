'use strict'

const models = require('../../models');
const Well = models.Well;
const Curve = models.Curve;
const Dataset = models.Dataset;
const asyncLoop = require('node-async-loop');
const config = require("config");
const wi_import = require("../../import-module");


wi_import.setBasePath(config.dataPath);



function importToDB(inputWell, userInfor, callback) {
    console.log('importToDB');
    inputWell.idUser = userInfor.idUser;

    Well.findOrCreate({
        where : { idWell : inputWell.idWell },
        defaults: inputWell
    }).spread((well, created) => {
        console.log('create new well? ' + created);
        asyncLoop(inputWell.datasetInfo, (datasetInfo, nextDataset) => {
            datasetInfo.idWell = well.idWell;
            Dataset.create(datasetInfo)
                .then(dataset => {
                    let curves = datasetInfo.curves;
                    asyncLoop(curves, function (curve, next) {
                        if(curve) {
                            // curve.idWell = well.idWell;
                            Curve.create({
                                name: curve.name,
                                idWell: curve.idWell,
                                unit: curve.unit,
                                path: curve.path,
                                idDataset: dataset.idDataset
                            }).then(() => {
                                next();
                            }).catch(err => {
                                console.log(err);
                                next(err);
                            });
                        }
                        else next();
                    }, function (err) {
                        if (err) nextDataset(err);
                        else nextDataset();
                    });
                })
                .catch(err => {
                    console.log('create datatset failed');
                    callback(err, null);
                });
        }, (err) => {
            if(err) {
                console.log("import curve failed: ", err);
                callback(err, null);
            }
            else {
                callback(null, well);
            }
        });
    })
}

function processFileUpload(file, importData, callback) {
    console.log("______processFileUpload________");
    console.log(importData.well);
    let fileFormat = file.filename.substring(file.filename.lastIndexOf('.') + 1, file.filename.length);
    if (/LAS/.test(fileFormat.toUpperCase())) {
        wi_import.extractLAS2(file.path, importData, function (err, result) {
            if (err) {
                console.log("this is not a las 2 file");
                if (/LAS_3_DETECTED/.test(err)) {
                    console.log("this is las 3 file");
                    wi_import.extractLAS3(file.path, importData, function (err, result) {
                        if (err) {
                            console.log('las 3 extract failed!');
                            callback(err, null);
                        }
                        else {
                            console.log("las 3 extracted");
                            importToDB(result, importData.userInfo, (err, result) => {
                                if(err) {
                                    console.log("import to db failed");
                                    callback(err, null);
                                }
                                else {
                                    console.log("import done");
                                    callback(null, result);
                                }
                            })
                        }
                    });
                }
                else {
                    console.log("this is not las 3 too");
                    callback(err, null);
                }
            }
            else {
                importToDB(result, importData.userInfo, function (err, result) {
                    if (err) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }
                });
            }
        })
    }
    else {
        callback('this is not las file', null);
    }
}

function uploadLasFiles(req, cb) {
    if(!req.files) return cb('NO FILE CHOSEN!!!');
    let output = new Array();
    let importData = {};
    importData.userInfo = req.decoded;
    Well.findById(req.body.idWell)
        .then(well => {
            importData.well = well;
            asyncLoop(req.files, (file, next) => {
                if (!file) return next('NO FILE CHOSEN!!!');
                processFileUpload(file, importData, (err, result) => {
                    if (err) next(err)
                    else {
                        output.push(result);
                        next();
                    }
                });
            }, (err) => {
                if (err) cb(err, null);
                else cb(null, output);
            })
        })

}

module.exports = {
    uploadLasFiles: uploadLasFiles
}
