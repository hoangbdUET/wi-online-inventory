'use strict'

const coredataExtractor = require('../../extractors/core_data/core_data-extractor')
const importToDB = require('./importToDB')
const models = require('../../models')
const asyncLoop = require('node-async-loop')

function processFileUpload(file, importData, callback) {
    let fileFormat = file.filename.substring(file.filename.lastIndexOf('.') + 1);
    if (/CSV/.test(fileFormat.toUpperCase())) {
        coredataExtractor(file, importData, function (err, result) {
            if (err) {
                console.log("extract core data file failed");
                callback(err, null);
            }
            else {
                importToDB(result, importData.userInfor, function (err, result) {
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

module.exports.uploadFiles = function (req, cb) {
    if (!req.files) return cb('NO FILE CHOSEN!!!');
    let output = new Array();
    let importData = {};
    importData.userInfor = req.decoded;
    importData.isUnitsRow = req.body.isUnitsRow;
    models.Well.findById(req.body.idWell)
        .then(well => {
            importData.well = well;
            asyncLoop(req.files, (file, next) => {
                if (!file) return next('NO FILE CHOSEN!!!');
                processFileUpload(file, importData, (err, result) => {
                    if (err) next(err)
                    else {
                        output.push(result);
                        next();
                    }
                });
            }, (err) => {
                if (err) cb(err, null);
                else cb(null, output);
            })
        })
}