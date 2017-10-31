"use strict";

var express = require("express");
var router = express.Router();
var config = require("config");
var multer = require('multer');
var wi_import = require("../../import-module");
var asyncLoop = require("node-async-loop");
let models = require('../../models');
var Well = models.Well;
var Curve = models.Curve;
var File = models.File;

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

var upload = multer({storage: storage});

function importToDB(inputWell, file, userInfor, callback) {
    let fileInfo = new Object();
    fileInfo.name = file.originalname;
    fileInfo.size = file.size;
    fileInfo.idUser = userInfor.idUser;

    let wellInfo = new Object();
    wellInfo.name = inputWell.wellname;
    wellInfo.startDepth = inputWell.start;
    wellInfo.stopDepth = inputWell.stop;
    wellInfo.step = inputWell.step;

    File.create(fileInfo)
        .then((file) => {
            wellInfo.idFile = file.idFile;
            Well.create(wellInfo)
                .then((well) => {
                    asyncLoop(inputWell.datasetInfo, (dataset, nextDataset) => {
                        let curves = dataset.curves;
                        console.log('curves: ' + curves);
                        asyncLoop(curves, function (curve, next) {
                            if(curve) {
                                curve.idWell = well.idWell;
                                Curve.create({
                                    name: curve.datasetname + "_" + curve.name,
                                    alias: curve.name,
                                    idWell: curve.idWell,
                                    unit: curve.unit,
                                    path: curve.path
                                }).then(() => {
                                    next();
                                }).catch(err => {
                                    console.log(err);
                                    next(err);
                                });
                            }
                            else next();
                        }, function (err) {
                            if(err) nextDataset(err);
                            else nextDataset();
                        });
                    }, (err) => {
                        if(err) {
                            console.log("import curve failed: ", err);
                            callback(err, null);
                        }
                        else {
                            callback(null, file);
                        }
                    });

                })
                .catch((err) => {
                    console.log('Well creation failed: ' + err);

                })
        })
        .catch((err) => {
        console.log('file creation failed: ' + err);
        })
}

function processFileUpload(file, userInfor, callback) {
    console.log("______processFileUpload________");
    let fileFormat = file.filename.substring(file.filename.lastIndexOf('.') + 1, file.filename.length);

    if (/LAS/.test(fileFormat.toUpperCase())) {
        wi_import.extractLAS2(file.path, function (err, result) {
            if (err) {
                console.log("this is not a las 2 file");
                if (/LAS_3_DETECTED/.test(err)) {
                    console.log("this is las 3 file");
                    wi_import.extractLAS3(file.path, function (err, result) {
                        if (err) {
                            console.log('las 3 extract failed!');
                            callback(err, null);
                        }
                        else {
                            console.log("las 3 extracted");
                            importToDB(result, file, userInfor, (err, result) => {
                                if(err) {
                                    console.log("import to db failed");
                                    callback(err, null);
                                }
                                else {
                                    console.log("import done");
                                    callback(null, result);
                                }
                            })
                        }
                    });
                }
                else {
                    console.log("this is not las 3 too");
                    callback(err, null);
                }
            }
            else {
                importToDB(result, file, userInfor, function (err, result) {
                    if (err) {
                        callback(err, null);
                    }
                    else {
                        callback(null, result);
                    }
                });
            }
        })
    }
    else {
        callback('this is not las file', null);
    }
}

router.post('/upload/lases', upload.array('file'), function (req, res)  {
    wi_import.setBasePath(config.dataPath);
    console.log(req.files);
    let output = new Array();
    asyncLoop(req.files, (file, next) => {
        processFileUpload(file, req.decoded, (err, result) => {
            if(err) next(err)
            else {
                File.findById(result.idFile, {include: {all: true, include: {all: true}}}).then(fileObj => {
                    if (fileObj) output.push(fileObj);
                    next();
                }).catch(err => {
                    next(err);
                });
            }
        });
    }, (err) => {
        if(err) res.status(500).send(err);
        else res.status(200).send(output);
    })

})

module.exports = router;