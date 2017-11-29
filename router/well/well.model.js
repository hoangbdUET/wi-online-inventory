'use strict'
let models = require('../../models');
let Well = models.Well;
let User = models.User;
let curveModel = require('../curve/curve.model');
const datasetModel = require('../dataset/dataset.model');
const asyncLoop = require('node-async-loop');
const importModule = require('../../import-module');
const hashDir = importModule.hashDir;
const config = require('config');


function findWellById(idWell, username) {
    return Well.findById(
        idWell,
        {
            include : [ {
                model: User,
                attributes: [],
                where: { username : username},
                required: true
            }],
            logging: console.log
        })
}

function deleteCurves(curves) {
    console.log('~~~deleteCurves~~~');
    if(!curves) return;
    let asyncLoop = require('node-async-loop');
    asyncLoop(curves, (curve, next)=> {
        curveModel.deleteCurveFile(curve.path);
        next();
    }, (err) => {
        if(err) console.log('end asyncloop:' + err);
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
                        deleteCurves(curves);
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
                                hashDir.copyFile(config.dataPath, curve.path, hashedNewCurveDir, curve.name + '.txt');
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

module.exports = {
    findWellById: findWellById,
    deleteWell: deleteWell,
    copyDatasets: copyDatasets
}