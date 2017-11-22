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



function findCurveById(idCurve, idUser) {
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
    let curveName = path.slice(path.lastIndexOf('/') + 1, path.length);
    let dir = path.slice(0, path.lastIndexOf('/') + 1);
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
        let fs = require('fs');
        fs.readdir(dir, (err, files) => {
            files.forEach((file)=> {
                if(file.indexOf(curveName) != -1) fs.unlink(dir + file, (err)=> {
                    if(!err) {
                        // let deleteEmpty = require('delete-empty');
                        // deleteEmpty(config.dataPath, () => {
                        // });
                    }
                    else console.log(err);
                })
            })

        })
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

function getCurves(idDataset, idUser) {
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