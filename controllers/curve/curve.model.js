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

function findCurveById(idCurve, username, attributes) {
    return Curve.findById(idCurve, {
        include : {
            model: Dataset,
            attributes : attributes && attributes.dataset ? attributes.dataset : [],
            required: true,
            include: {
                model: Well,
                attributes: attributes && attributes.well? attributes.well : [],
                required: true,
                include: {
                    model: User,
                    attributes: attributes && attributes.user ? attributes.user : [],
                    required: true,
                    where: {
                        username: username
                    }
                }
            }
        },
        //logging: console.log
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
        // logging: console.log
    })
}

function editCurve(body, username, cb){
    let attributes = {
        well: ['name'],
        dataset: ['name']
    }
    findCurveById(body.idCurve, username, attributes)
        .then(curve => {
            if (curve) {
                const oldCurveName = curve.name;
                Object.assign(curve, body);
                curve.save().then(c => {
                    if(oldCurveName != curve.name){
                        const oldCurve = {
                            username: username,
                            wellname: curve.dataset.well.name,
                            datasetname: curve.dataset.name,
                            curvename: oldCurveName
                        }
                        const newCurve = Object.assign({}, oldCurve);
                        newCurve.curvename = body.name;
                        body.path = require('../fileManagement').moveCurveFile(oldCurve, newCurve);
                        Object.assign(curve, body);
                        curve.save();
                    }
                    cb(null, c);
                    }).catch(e => {
                        cb(e);
                    })
            } else {
                cb('NO CURVE FOUND FOR EDIT');
            }
        }).catch(err => {
        console.log('===========' + err)
        cb('FAILED TO FIND CURVE');
    });
}



module.exports = {
    findCurveById: findCurveById,
    deleteCurve : deleteCurve,
    getCurves: getCurves,
    deleteCurveFiles: deleteCurveFiles,
    createCurve: createCurve,
    editCurve: editCurve
}