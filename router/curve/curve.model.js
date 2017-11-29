'use strict'
let models = require('../../models');
let Well = models.Well;
let Dataset = models.Dataset;
let User = models.User;
let Curve = models.Curve;
let config = require('config');

const AWS = require('aws-sdk');
const credentials = new AWS.SharedIniFileCredentials({profile: 'wi_inventory'});
AWS.config.credentials = credentials;
let s3 = new AWS.S3({apiVersion: '2006-03-01'});

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
    require('node-async-loop')(curves, (curve, nextCurve)=> {
        let curveName = curve.path.slice(curve.path.lastIndexOf('/') + 1, curve.path.length);
        let dir = curve.path.slice(0, curve.path.lastIndexOf('/') + 1);
        if(config.s3Path){
            //be sure to delete all unit exported curve files
            let params = {
                Bucket: "wi-inventory",
                // Key: path
                Delimiter: '/',
                Prefix: dir
            }
            s3.listObjects(params, (err, data) => {
                let deleteParams = {
                    Bucket: "wi-inventory",
                    Delete: {Objects:[]}
                }
                data.Contents.forEach((content) => {
                    if(content.Key.indexOf(curveName) != -1) {
                        console.log(content.Key + ' will be deleted.');
                        deleteParams.Delete.Objects.push({Key: content.Key});
                    }
                })

                s3.deleteObjects(deleteParams, (err)=>{
                    if(err) console.log("s3 delete object failed " + err);
                    else console.log("s3 delete object done");
                })
            })
        }
        else {
            //be sure to delete all unit exported curve files
            dir = config.dataPath + '/' + dir;
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
        console.log('curve files deleted');
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