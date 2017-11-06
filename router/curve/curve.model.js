'use strict'
let models = require('../../models');
let Well = models.Well;
let File = models.File;
let User = models.User;
let Curve = models.Curve;
let config = require('config');

const AWS = require('aws-sdk');
const credentials = new AWS.SharedIniFileCredentials({profile: 'wi_inventory'});
AWS.config.credentials = credentials;
let s3 = new AWS.S3({apiVersion: '2006-03-01'});



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

function deleteCurveFile(path) {
    console.log('~~~deleteCurveFile~~~');
    if(config.s3Path){
        let params = {
            Bucket: "wi-inventory",
            Key: path
        }
        s3.deleteObject(params, (err) => {
            if(err) console.log("s3 delete object failed " + err);
        });

    }
    else {
        require('fs').unlink(path, (err, rs) => {
            if(!err) {
                let deleteEmpty = require('delete-empty');
                deleteEmpty(config.dataPath, () => {
                });
            }
            else console.log(err);
        });
    }
}

function deleteCurve(curve, callback) {
    let curvePath = curve.path;
    curve.destroy({paranoid: true})
        .then((curve)=>{
            deleteCurveFile(curvePath);
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
    getCurves: getCurves,
    deleteCurveFile: deleteCurveFile
}