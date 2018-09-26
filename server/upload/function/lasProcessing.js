'use strict';

const asyncLoop = require('node-async-loop');
const LASExtractor = require("wi-import").LASExtractor;
const importToDB = require('./importToDB');

async function processFileUpload(file, importData) {
    console.log("______processFileUpload________");
    // console.log(importData);
    // console.log(JSON.stringify(file));
    try {
        let fileFormat = file.filename.substring(file.filename.lastIndexOf('.') + 1);
        if (/LAS/.test(fileFormat.toUpperCase())) {
            const result = await LASExtractor(file, importData);
            console.log("processFileUpload: " + JSON.stringify(result, null, 2));
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
    let output = [];
    let errFile;
    try {
        if (!req.files) return cb('NO FILE CHOSEN!!!');
        // console.log(req);
        let importData = {};
        importData.userInfo = req.decoded;
        importData.override = !!(req.body.override && req.body.override === "true");

        for (const file of req.files) {
            errFile = file;
            const uploadResult = await processFileUpload(file, importData);
            output = output.concat(uploadResult);
        }
        return Promise.resolve(output);
    }
    catch (err) {
        console.log('upload las files failed: ' + err);
        const resVal = {
            err: err,
            errFile: errFile.originalname,
            successWells: output
        }
        if(output.length > 0) {
            return Promise.resolve(resVal);
        } else {
            return Promise.reject(resVal);
        }
    }
}

module.exports = {
    uploadLasFiles: uploadLasFiles
};
