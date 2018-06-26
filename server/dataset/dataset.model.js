'use strict'

const models = require('../models');
const Dataset = models.Dataset;
const curveModel = require('../curve/curve.model');
let config = require('config');
let request = require('request');


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
    };
    findDatasetById(body.idDataset, username, attributes)
        .then(dataset=> {
            const oldDatasetName = dataset.name;

            Object.assign(dataset, body);
            dataset.save().then(dataset => {
                if(dataset.name !== oldDatasetName){
                    let changeSet = {
                        username: username,
                        wellname: dataset.well.name,
                        oldDatasetName: oldDatasetName,
                        newDatasetName: dataset.name,
                        curves: dataset.curves
                    };
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
                cb(null, dataset);
            }).catch(e => {
                cb(e);
            })
        }).catch(err => {
        console.log(err);
        cb('FAILED TO FIND DATASET')
    })
}

function findDatasetByName(wellName, datasetName, username, token, idProject, callback) {
    let Op = require('sequelize').Op;
    models.Well.findOrCreate({
        where: {
            name: {[Op.eq]: wellName},
            username: {[Op.eq]: username}
        }, default: {
            name: wellName,
            username: username,
            filename: wellName
        }
    }).then(function(well) {
        well = well[0];
        getWellFromProject(wellName, idProject, token).then(function(_well) {
            models.Dataset.findOrCreate({
                where: {
                    idWell: well.idWell,
                    name: datasetName,
                }, default: {
                    name: datasetName,
                    unit: "M",
                    top: _well.topDepth,
                    bottom: _well.bottomDepth,
                    step: _well.step
                }
            }).then(function(dataset){
                callback(null, dataset[0]);
            }).catch(function(err) {
                callback(err);
                console.log('err 1', err);
            })
        }).catch(function(err){
            callback(err);
            console.log('err2', err);
        })
    }).catch(function(err){
        callback(err);
        console.log('err3',err);
    })
}
function getWellFromProject(wellName, idProject, token) {
    console.log('http://' + config.Service.project + '/project/well/full-info');
    return new Promise(function (resolve, reject) {
        let options = new Options('/project/well/full-info', token, { name: wellName, idProject: idProject });
        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                if (body.content) {
                    resolve(body.content);
                } else {
                    reject(body)
                }
            }
        });
    });
}
class Options {
    constructor(path, token, payload) {
        this.method = 'POST';
        this.url = 'http://' + config.Service.project + path;
        this.headers = {
            'Cache-Control': 'no-cache',
            Authorization: token,
            'Content-Type': 'application/json'
        };
        this.body = payload;
        this.json = true;
    }
}

module.exports = {
    findDatasetById : findDatasetById,
    getDatasets: getDatasets,
    deleteDataset: deleteDataset,
    createDataset: createDataset,
    editDataset: editDataset,
    findDatasetByName: findDatasetByName
};