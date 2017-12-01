'use strict'
let models = require('../../models');
let Well = models.Well;
let Dataset = models.Dataset;
let User = models.User;
let Curve = models.Curve;
let config = require('config');

function createCurve(body, cb) {
    Curve.create(body).then(curve => {
        cb(null, curve);
    }).catch(err => {
        cb(err, null);
    });
}

function findCurveById(idCurve, username) {
    return Curve.findById(idCurve, {
        include : {
            model: Dataset,
            attributes : [],
            required: true,
            include: {
                model: Well,
                attributes: [],
                required: true,
                include: {
                    model: User,
                    attributes: [],
                    required: true,
                    where: {
                        username: username
                    }
                }
            }
        },
        logging: console.log
    });
}

function deleteCurveFiles(curves) {
    //curves must be array
    console.log('~~~deleteCurveFiles~~~');
    if(!curves || curves.length <= 0) return;
    require('node-async-loop')(curves, (curve, nextCurve)=> {
        if(config.s3Path){
            //be sure to delete all unit exported curve files
            require('../s3').deleteCurve(curve);
        }
        else {
            //be sure to delete all unit exported curve files
            let curveName = curve.path.slice(curve.path.lastIndexOf('/') + 1, curve.path.length);
            let dir =config.dataPath + '/' +  curve.path.slice(0, curve.path.lastIndexOf('/') + 1);
            const fs = require('fs');
            fs.readdir(dir, (err, files) => {
                files.forEach((file)=> {
                    if(file.indexOf(curveName) != -1) fs.unlink(dir + file, (err)=> {
                        if(err) console.log(err);
                    })
                })

            })
        }
        nextCurve();
    }, (err)=> {
        console.log('curve files deleted' + err);
    })
}

function deleteCurve(curve, callback) {
    curve.destroy({paranoid: true})
        .then((rs)=>{
            deleteCurveFiles([curve]);
            callback(null, rs);
        })
        .catch((err) => {
            callback(err, null);
        })
}

function getCurves(idDataset, username) {
    return Curve.findAll({
        where: {
            idDataset: idDataset
        },
        include : {
            model: Dataset,
            attributes : [],
            required: true,
            include: {
                model: Well,
                attributes: [],
                required: true,
                include: {
                    model: User,
                    attributes: [],
                    required: true,
                    where: {
                        username: username
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
    deleteCurveFiles: deleteCurveFiles,
    createCurve: createCurve
}