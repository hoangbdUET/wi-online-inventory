'use strict';
const asyncLoop = require('node-async-loop');
const models = require('../../models');
const asciiExtractor = require('../../extractors/ascii/ascii-extractor');
const importToDB = require('./importToDB');


function processFileUpload(file, importData, cb) {
    console.log('___processFileUpload: ' + JSON.stringify(importData));
    asciiExtractor.extractCurves(file, importData, (err, result) => {
        // console.log(JSON.stringify(result));
        if(err) cb(err);
        else {
            importToDB(result, importData.userInfo, (err, result) => {
                cb(err, result);
            })
        }
    })
}

function uploadAsciiFiles(req, cb) {
    if(!req.files) return cb('NO FILE CHOSEN!!!');
    let output = [];
    let importData = {};
    console.log('uploadAsciiFiles: ' + JSON.stringify(req.body));

    //req.body.createNewWell
    //req.body.createNewDataset
    //req.body.idWell           => importData.well
    //req.body.idDataset        => importData.dataset
    //req.body.columnFormat = 1/2/3/4
    //req.body.curveNameStartAt
    //req.body.curveUnitStartAt
    //req.body.curveDataStartAt
    //req.body.userInfo.username
    //req.body.datasetsStartAt

    importData.userInfo = req.decoded;
    importData.columnFormat = req.body.columnFormat;
    importData.curveNameStartAt = req.body.curveNameStartAt;
    importData.curveUnitStartAt = req.body.curveUnitStartAt;
    importData.curveDataStartAt = req.body.curveDataStartAt;
    importData.datasetsStartAt = req.body.datasetsStartAt;

    let promise = new Promise(function (resolve, reject) {
        if(req.body.createNewWell == 'true'){
            resolve();
        }
        else if(req.body.createNewDataset == 'true') {
            models.Well.findById(req.body.idWell)
                .then(well => { resolve(well); })
                .catch((err) => { reject(err); })
        }
        else {
            models.Well.findById(req.body.idWell, {
                    include: {
                        model: models.Dataset,
                        // attributes: [],
                        where: {idDataset: req.body.idDataset},
                        required: true
                    }
                }
            ).then(well => { resolve(well); })
                .catch((err) => { reject(err); })
        }
    })

    promise.then(well => {
        console.log(well)
        if(well) {
            importData.well = well.toJSON();
            // if(well.datasets && well.datasets.length > 0) importData.dataset = well.datasets[0].toJSON();
        }
        asyncLoop(req.files, (file, nextFile) => {
            processFileUpload(file, importData, (err, result) => {
                if(err) nextFile(err);
                else {
                    output.push(result);
                    nextFile();
                }
            });
        }, (err) => {
            if(err) cb(err, null);
            else cb(null, output);
        })
    })
        .catch((err) => {
            console.log('catch: ' + err);
        })
}

module.exports = {
    uploadAsciiFiles: uploadAsciiFiles
};