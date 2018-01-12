'use strict'

const models = require('../../models');
const Well = models.Well;
const asyncLoop = require('node-async-loop');
const config = require("config");
const wi_import = require("../../extractors");
const importToDB = require('./importToDB');

wi_import.setBasePath(config.dataPath);

function processFileUpload(file, importData, callback) {
    console.log("______processFileUpload________");
    // console.log(importData);
    console.log(JSON.stringify(file));
    let fileFormat = file.filename.substring(file.filename.lastIndexOf('.') + 1, file.filename.length);
    if (/LAS/.test(fileFormat.toUpperCase())) {
        wi_import.extractLAS(file, importData, function (err, result) {
            if (err) {
                console.log("extract las file failed");
                callback(err, null);
            }
            else {
                importToDB(result, importData.userInfo, function (err, result) {
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

function uploadLasFiles(req, cb) {
    if (!req.files) return cb('NO FILE CHOSEN!!!');
    let output = new Array();
    let importData = {};
    importData.userInfo = req.decoded;
    Well.findById(req.body.idWell)
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

module.exports = {
    uploadLasFiles: uploadLasFiles
}
