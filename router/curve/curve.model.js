'use strict'
let models = require('../../models');
let Well = models.Well;
let File = models.File;
let User = models.User;
let Curve = models.Curve;
let config = require('config');
let deleteEmpty = require('delete-empty');


function findCurveById(idCurve, idUser) {
    return Curve.findById(idCurve, {
        include : {
            model: Well,
            attributes : [],
            required: true,
            include: {
                model: File,
                attributes: [],
                required: true,
                include: {
                    model: User,
                    attributes: [],
                    required: true,
                    where: {
                        idUser: idUser
                    }
                }
            }
        },
        logging: console.log
    });
}

function deleteCurve(curve, callback) {
    let curvePath = curve.path;
    curve.destroy({paranoid: true})
        .then((curve)=>{
            if(config.s3Path){
            }
            else {
                require('fs').unlinkSync(curvePath);
                deleteEmpty(config.dataPath, () => {
                });
            }
            callback(null, curve);
        })
        .catch((err) => {
            callback(err, null);
        })
}

function getCurves(idWell, idUser) {
    return Curve.findAll({
        where: {
            idWell: idWell
        },
        include : {
            model: Well,
            attributes : [],
            required: true,
            include: {
                model: File,
                attributes: [],
                required: true,
                include: {
                    model: User,
                    attributes: [],
                    required: true,
                    where: {
                        idUser: idUser
                    }
                }
            }
        },
        logging: console.log
    })
}



module.exports = {
    findCurveById: findCurveById,
    deleteCurve : deleteCurve,
    getCurves: getCurves
}