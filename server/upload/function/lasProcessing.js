'use strict';

const asyncLoop = require('node-async-loop');
const LASExtractor = require("wi-import").LASExtractor;
const importToDB = require('./importToDB');

async function processFileUpload(file, importData) {
    console.log("______processFileUpload: " + file.filename);
    // console.log(importData);
    // console.log(JSON.stringify(file));
    try {
        const result = await LASExtractor(file, importData);
        return importToDB(result, importData);
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
            console.log("processFileUpload DONE " + file.originalname)
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
    return Promise.resolve(resVal);
}

module.exports = {
    uploadLasFiles: uploadLasFiles
};
