'use strict'

const models = require('../../models');
const Dataset = models.Dataset;
const curveModel = require('../curve/curve.model');


function createDataset(body, cb) {
    Dataset.create(body).then(dataset => {
        cb(null, dataset);

    }).catch(err => {
        cb(err, null);
    });
}

function findDatasetById(idDataset, username, attributes) {

    let include = [{
        model: models.Well,
        attributes: attributes && attributes.well ? attributes.well : [],
        include : {
            model: models.User,
            attributes: [],
            where: {username: username},
            required: true
        },
        required: true
    }];
    if(attributes && attributes.curves) {
        let Curve = {
            model: models.Curve,
            attributes: ['idCurve', 'name']
        }
        include.push(Curve);
    }
    return Dataset.findById(idDataset, {
        include : include
    })
}

function getDatasets(idWell, username) {
    return Dataset.findAll({
        where: {
            idWell: idWell
        },
        include : [{
            model: models.Well,
            attributes: [],
            include: [{
                model: models.User,
                attributes: [],
                where: {username: username},
                required: true
            }],
            required: true
        }]
    })
}

function deleteDataset(idDataset, username, callback) {
    findDatasetById(idDataset, username)
        .then(dataset => {
            curveModel.getCurves(dataset.idDataset, username)
                .then(curves => {
                    dataset.destroy()
                        .then((rs) => {
                            curveModel.deleteCurveFiles(curves);
                            callback(null, rs);
                        })
                        .catch(err => {
                            throw new Error('dataset destroy failed: ' + err.message);
                            // callback(err, null);
                        })
                })
                .catch(err => {
                    throw new Error('failed to get curve: ' + err.message);
                    // callback(err, null);
                })
        })
        .catch(err => {
            callback(err, null);
        })
}

function editDataset(body, username, cb) {
    const attributes = {
        well: ['name'],
        curves: ['idCurve', 'name']
    }
    findDatasetById(body.idDataset, username, attributes)
        .then(dataset=> {
            if(dataset.name != body.name){
                let changeSet = {
                    username: username,
                    wellname: dataset.well.name,
                    oldDatasetName: dataset.name,
                    newDatasetName: body.name,
                    curves: dataset.curves
                }
                let changedCurves = require('../fileManagement').moveDatasetFiles(changeSet);
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
            Object.assign(dataset, body);
            dataset.save().then(c => {
                cb(null, c);
            }).catch(e => {
                cb(e);
            })
        }).catch(err => {
            console.log(err);
            cb('FAILED TO FIND DATASET')
    })
}

module.exports = {
    findDatasetById : findDatasetById,
    getDatasets: getDatasets,
    deleteDataset: deleteDataset,
    createDataset: createDataset,
    editDataset: editDataset
}