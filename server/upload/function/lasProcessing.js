'use strict';

const asyncLoop = require('node-async-loop');
const LASExtractor = require("wi-import").LASExtractor;
const importToDB = require('./importToDB');

async function processFileUpload(file, importData) {
    console.log("______processFileUpload: " + file.filename);
    // console.log(importData);
    // console.log(JSON.stringify(file));
    try {
        let fileFormat = file.filename.substring(file.filename.lastIndexOf('.') + 1);
        if (/LAS/.test(fileFormat.toUpperCase())) {
            const result = await LASExtractor(file, importData);
            return importToDB(result, importData);
        }
        else {
            throw 'this is not las file';
        }
    }
    catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
}

async function uploadLasFiles(req) {
    let successFiles = [];
    let successWells = [];
    let errFiles = [];
    if (!req.files) return cb('NO FILE CHOSEN!!!');
    // console.log(req);
    let importData = {};
    importData.userInfo = req.decoded;
    importData.override = !!(req.body.override && req.body.override === "true");

    for (const file of req.files) {
        try {
            const uploadResult = await processFileUpload(file, importData);
            successFiles.push(file.originalname);
            successWells = successWells.concat(uploadResult);
        } catch (err){
            console.log('upload las files failed: ' + err);
            errFiles.push({
                filename: file.originalname,
                err: err
            });
        }
    }
    const resVal = {
        errFiles: errFiles,
        successWells: successWells,
        successFiles: successFiles
    }
    if(successFiles.length > 0) {
        return Promise.resolve(resVal);
    } else {
        return Promise.reject(resVal);
    }
}

module.exports = {
    uploadLasFiles: uploadLasFiles
};
