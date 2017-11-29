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

function findDatasetById(idDataset, username) {
    return Dataset.findById(idDataset, {
        include : [{
            model: models.Well,
            attributes: [],
            include : {
                model: models.User,
                attributes: [],
                where: {username: username},
                required: true
            },
            required: true
        }]
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
                            callback(err, null);
                        })
                })
                .catch(err => {
                    callback(err, null);
                })
        })
        .catch(err => {
            callback(err, null);
        })
}

module.exports = {
    findDatasetById : findDatasetById,
    getDatasets: getDatasets,
    deleteDataset: deleteDataset,
    createDataset: createDataset
}