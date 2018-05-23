'use strict';

let models = require('../models');
let Well = models.Well;
let User = models.User;
let curveModel = require('../curve/curve.model');
const datasetModel = require('../dataset/dataset.model');
const asyncLoop = require('node-async-loop');
const hashDir = require('../../extractors/hash-dir');
const config = require('config');


function findWellById(idWell, username, attributes) {
    let include = [{
        model: User,
        attributes: [],
        where: {username: username},
        required: true
    }];
    if (attributes && attributes.datasets) {
        let includeDatasets = {
            model: models.Dataset,
            attributes: ['idDataset', 'name']
        };
        if (attributes.curves) includeDatasets.include = {
            model: models.Curve,
            attributes: ['idCurve', 'name']
        };
        if (attributes.revision) includeDatasets.include.include = {
            model: models.CurveRevision
        };
        include.push(includeDatasets);
    }
    return Well.findById(
        idWell,
        {
            include: include
            // logging: console.log
        })
}


function getCurves(idWell, cb) {
    let curves = [];
    models.Dataset.findAll({
        where: {
            idWell: idWell
        },
        include: [{
            model: models.Curve,
            include: {
                model: models.CurveRevision
            }
        }]
    }).then(datasets => {
        if (!datasets || datasets.length <= 0) return cb(curves);
        asyncLoop(datasets, (dataset, nextDataset) => {
            curves = curves.concat(dataset.curves);
            nextDataset();
        }, (err) => {
            if (err) console.log(err);
            cb(curves);
        })
    })
}

async function deleteWell(idWell, username) {
    findWellById(idWell, username)
        .then((well) => {
            getCurves(well.idWell, async (curves) => {
                await curveModel.deleteCurveFiles(curves);
                well.destroy()
                    .then((rs) => {
                        Promise.resolve(rs);
                    })
                    .catch(err => {
                        Promise.reject(err)
                    })
            })
        })
        .catch((err) => {
            Promise.reject(err)
        })
}

function copyDatasets(req, cb) {
    let newDatasets = [];
    Well.findById(req.body.idWell)
        .then(well => {
            asyncLoop(req.body.datasets, (dataset, nextDataset) => {
                models.Curve.findAll({
                    where: {
                        idDataset: dataset.idDataset
                    },
                    raw: true
                }).then(curves => {
                    delete dataset.idDataset;
                    delete dataset.createdAt;
                    delete dataset.updatedAt;
                    dataset.idWell = well.idWell;
                    datasetModel.createDataset(dataset, (err, newDataset) => {
                        if (!err) {
                            asyncLoop(curves, (curve, nextCurve) => {
                                delete curve.idCurve;
                                delete curve.createdAt;
                                delete curve.updatedAt;
                                curve.idDataset = newDataset.idDataset;
                                const hashedNewCurveDir = hashDir.getHashPath(req.decoded.username + well.name + dataset.name + curve.name);
                                if (!config.s3Path) {
                                    hashDir.copyFile(config.dataPath, curve.path, hashedNewCurveDir, curve.name + '.txt');
                                }
                                else {
                                    require('../s3').copyCurve(curve.path, hashedNewCurveDir + curve.name + '.txt');
                                }
                                curve.path = hashedNewCurveDir + curve.name + '.txt';
                                curveModel.createCurve(curve, (err, newCurve) => {
                                    if (err) {
                                        console.log('curve ' + err);
                                        nextCurve(err);
                                    }
                                    else nextCurve();
                                })
                            }, (err) => {
                                if (err) {
                                    console.log(err);
                                    nextDataset(err);
                                }
                                else {
                                    newDatasets.push(newDataset);
                                    nextDataset();
                                }
                            })
                        }
                        else {
                            nextDataset(err);
                        }
                    })
                })
            }, (err) => {
                if (!err) {
                    cb(null, newDatasets);
                }
                else {
                    console.log(err);
                    cb(err, null);
                }
            })
        })
        .catch(err => {
            console.log(err);
            cb(err, null);
        })

}

function editWell(body, username, cb) {
    let attributes = {
        datasets: ['idDataset', 'name'],
        curves: ['idCurve', 'name'],
        revision: true
    };
    findWellById(body.idWell, username, attributes)
        .then(well => {
            if (well) {
                const oldWellName = well.name;
                Object.assign(well, body);
                well.save().then(c => {
                    if (well.name !== oldWellName) {
                        let changeSet = {
                            username: username,
                            oldWellName: oldWellName,
                            newWellName: well.name,
                            datasets: well.datasets
                        };
                        let changedCurves = require('../fileManagement').moveWellFiles(changeSet);
                        changedCurves.forEach(changedCurve => {
                            models.Curve.findById(changedCurve.idCurve)
                                .then(curve => {
                                    Object.assign(curve, changedCurve);
                                    curve.save().catch(err => {
                                        console.log(err);
                                    })
                                })
                        })
                    }
                    cb(null, c);
                }).catch(e => {
                    cb(e);
                })
            } else {
                cb('NO WELL FOUND TO EDIT');
            }
        }).catch(err => {
        cb(err);
    });
}

function makeFileFromJSON(JSONdata, callback) {
    const tempfile = require('tempfile');
    const fs = require('fs');
    const json2csv = require('json2csv');
    let path = tempfile('.csv');
    let fields = JSONdata.fields;
    let csv = json2csv({data: JSONdata.data, fields: fields});
    fs.writeFile(path, csv, function (err) {
        if (err) {
            callback(err, null);
        }
        callback(null, path);
    });
}

function exportWellHeader(idWells, callback) {
    const asyncEach = require('async/each');
    let JSONdata = {};
    JSONdata.fields = ['WELL_NAME', 'API', 'AREA', 'AUTHOR', 'CNTY', 'CODE', 'COMP', 'COMPANY', 'COUN', 'CTRY', 'DATE', 'EASTING', 'filename', 'FLD', 'GDAT', 'GEN1', 'GEN2', 'GEN3', 'GEN4', 'GEN5', 'GEN6', 'GL', 'ID', 'KB', 'LATI', 'LIC', 'LOC', 'LOGDATE', 'LONG', 'LOSTARTIME', 'NAME', 'NORTHING', 'NULL', 'OPERATOR', 'PROJ', 'PROV', 'SRVC', 'STATE', 'STATUS', 'STEP', 'STOP', 'STRT', 'TD', 'TOP', 'TYPE', 'UWI', 'WELL'];
    JSONdata.data = [];
    if (!idWells) {
        callback("NO_WELL", null);
    } else {
        if (idWells.length === 0) {
            //all well
            console.log("ALL WELL");
            Well.findAll({include: models.WellHeader}).then(rs => {
                asyncEach(rs, function (well, nextWell) {
                    let data = {};
                    asyncLoop(well.well_headers, function (header, nextHeader) {
                        data.WELL_NAME = well.name;
                        data[header.header] = header.value.toString();
                        nextHeader();
                    }, function () {
                        JSONdata.data.push(data);
                        nextWell();
                    });
                }, function () {
                    makeFileFromJSON(JSONdata, function (err, path) {
                        console.log("OK ", path);
                        callback(err, path);
                    });

                });
            }).catch(err => {
                callback(err, null);
            });
        } else {
            asyncEach(idWells, function (idWell, nextWell) {
                Well.findById(idWell, {include: models.WellHeader}).then(well => {
                    let data = {};
                    asyncEach(well.well_headers, function (header, nextHeader) {
                        data.WELL_NAME = well.name;
                        data[header.header] = header.value;
                        nextHeader();
                    }, function () {
                        JSONdata.data.push(data);
                        nextWell();
                    });
                }).catch(err => {
                    nextWell();
                    callback(err, null);
                })
            }, function (err) {
                makeFileFromJSON(JSONdata, function (err, path) {
                    console.log("OK ", path);
                    callback(err, path);
                });
            });
        }
    }
}

module.exports = {
    findWellById: findWellById,
    deleteWell: deleteWell,
    copyDatasets: copyDatasets,
    editWell: editWell,
    exportWellHeader: exportWellHeader
};