'use strict'
let models = require('../../models');
let Well = models.Well;
let User = models.User;
let curveModel = require('../curve/curve.model');
const datasetModel = require('../dataset/dataset.model');
const asyncLoop = require('node-async-loop');

function findWellById(idWell, idUser) {
    return Well.findById(
        idWell,
        {
            include : [ {
                model: User,
                attributes: [],
                where: { idUser : idUser},
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

function deleteWell(idWell, idUser, callback) {
    findWellById(idWell, idUser)
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
module.exports = {
    findWellById: findWellById,
    deleteWell: deleteWell
}