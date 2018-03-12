'use strict';

const asyncLoop = require('node-async-loop');
const LASExtractor = require("../../../extractors/las/las-extractor");
const importToDB = require('./importToDB');

async function processFileUpload(file, importData) {
    console.log("______processFileUpload________");
    console.log(JSON.stringify(file));
    try{
        let fileFormat = file.filename.substring(file.filename.lastIndexOf('.') + 1);
        if (/LAS/.test(fileFormat.toUpperCase())) {
            const result = await LASExtractor(file, importData)
            return importToDB(result, importData);
        }
        else {
            throw 'this is not las file';
        }
    }
    catch(err) {
        console.log(err);
        return Promise.reject(err);
    }
}

async function uploadLasFiles(req) {
    try {
        if (!req.files) return cb('NO FILE CHOSEN!!!');
        let output = [];
        let importData = {};
        importData.userInfo = req.decoded;
        importData.override = !!(req.body.override && req.body.override === "true");

        for (const file of req.files) {
            const uploadResult = await processFileUpload(file, importData);
            output.push(uploadResult);
        }
        return Promise.resolve(output);
    }
    catch (err){
        console.log('upload las files failed: ' + err);
        return Promise.reject(err);
    }
}

module.exports = {
    uploadLasFiles: uploadLasFiles
};
