'use strict'
let models = require('../../models');
let Well = models.Well;
let File = models.File;
let User = models.User;
let Curve = models.Curve;
let curveModel = require('../curve/curve.model');

function findWellById(idWell, idUser) {
    return Well.findById(
        idWell,
        {
            include : [{
                model: File,
                attributes: [],
                include : [ {
                    model: User,
                    attributes: [],
                    where: { idUser : idUser},
                    required: true
                }],
                required : true
            }, {
                model: Curve
            }],
            logging: console.log
        })
}

function deleteCurves(curves) {
    console.log('~~~deleteCurves~~~');
    let asyncLoop = require('node-async-loop');
    asyncLoop(curves, (curve, next)=> {
        curveModel.deleteCurveFile(curve.path);
        next();
    }, (err) => {
        if(err) console.log('end asyncloop:' + err);
    })
}

function deleteWell(idWell, idUser, callback) {
    findWellById(idWell, idUser)
        .then((well) => {
            let curves = well.curves;
            well.destroy({paranoid: true})
                .then((rs)=>{
                    deleteCurves(curves);
                    callback(null, rs);
                })
                .catch((err)=>{
                    callback(err, null);
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