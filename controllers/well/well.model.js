'use strict'
let models = require('../../models');
let Well = models.Well;
let User = models.User;
let curveModel = require('../curve/curve.model');
const datasetModel = require('../dataset/dataset.model');
const asyncLoop = require('node-async-loop');
const importModule = require('../../extractors');
const hashDir = importModule.hashDir;
const config = require('config');


function findWellById(idWell, username, attributes) {
    let include = [ {
        model: User,
        attributes: [],
        where: { username : username},
        required: true
    }]
    if(attributes && attributes.datasets){
        let includeDatasets = {
            model: models.Dataset,
            attributes: ['idDataset', 'name']
        }
        if(attributes.curves) includeDatasets.include = {
            model: models.Curve,
            attributes: ['idCurve', 'name']
        }
        include.push(includeDatasets);
    }
    return Well.findById(
        idWell,
        {
            include : include
            // logging: console.log
        })
}


function getCurves(idWell, cb) {
    let curves = [];
    models.Dataset.findAll({
        where: {
            idWell: idWell
        },
        include : [{
            model: models.Curve
        }]
    }).then(datasets => {
        if(!datasets || datasets.length <= 0) return cb(curves);
        asyncLoop(datasets, (dataset, nextDataset) => {
            curves = curves.concat(dataset.curves);
            nextDataset();
        }, (err) => {
            if(err) console.log(err);
            cb(curves);
        })
    })
}

function deleteWell(idWell, username, callback) {
    findWellById(idWell, username)
        .then((well) => {
            getCurves(well.idWell, (curves) => {
                well.destroy()
                    .then((rs)=>{
                        curveModel.deleteCurveFiles(curves);
                        callback(null, rs);
                    })
                    .catch(err => {
                        callback(err, null);
                    })
            })
        })
        .catch((err) => {
            callback(err, null);
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
                        if(!err) {
                            asyncLoop(curves, (curve, nextCurve) => {
                                delete curve.idCurve;
                                delete curve.createdAt;
                                delete curve.updatedAt;
                                curve.idDataset = newDataset.idDataset;
                                const hashedNewCurveDir = hashDir.getHashPath(req.decoded.username + well.name + dataset.name + curve.name);
                                if(!config.s3Path) {
                                    hashDir.copyFile(config.dataPath, curve.path, hashedNewCurveDir, curve.name + '.txt');
                                }
                                else {
                                    require('../s3').copyCurve(curve.path, hashedNewCurveDir + curve.name + '.txt');
                                }
                                curve.path = hashedNewCurveDir + curve.name + '.txt';
                                curveModel.createCurve(curve, (err, newCurve)=> {
                                    if(err) {
                                        console.log('curve ' + err);
                                        nextCurve(err);
                                    }
                                    else nextCurve();
                                })
                            }, (err)=> {
                                if(err) {
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
                if(!err) {
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

function editWell(body, username, cb){
    let attributes = {
        datasets: ['idDataset', 'name'],
        curves: ['idCurve', 'name']
    }
    findWellById(body.idWell, username, attributes)
        .then(well => {
            if (well) {
                if(well.name != body.name){
                    let changeSet = {
                        username: username,
                        oldWellName: well.name,
                        newWellName: body.name,
                        datasets: well.datasets
                    }
                    let changedCurves = require('../fileManagement').moveWellFiles(changeSet);
                    changedCurves.forEach(changedCurve => {
                        models.Curve.findById(changedCurve.idCurve)
                            .then(curve=> {
                                Object.assign(curve, changedCurve);
                                curve.save().catch(err => {
                                    console.log(err);
                                })
                            })
                    })
                }
                Object.assign(well, body);
                well.save().then(c => {
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

module.exports = {
    findWellById: findWellById,
    deleteWell: deleteWell,
    copyDatasets: copyDatasets,
    editWell: editWell
}