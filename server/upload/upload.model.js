const responseJSON = require('../response');
const lasProcessing = require('./function/lasProcessing');
const asciiProcessing = require('./function/asciiProcessing');
const coredataProcessing = require('./function/coredataProcessing');
const csvProcessing = require('./function/csvProcessing');
// const dlisProcessing = require('./function/dlisProcessing');
const config = require('config');
const wiImport = require('wi-import');

wiImport.setBasePath(config.dataPath);

let uploadAsciiFiles = function (req, cb) {
    asciiProcessing.uploadAsciiFiles(req, cb);
};

let uploadFiles = function (req, cb) {
    coredataProcessing.uploadFiles(req, cb);
};

module.exports = {
    uploadAsciiFiles: uploadAsciiFiles,
    uploadFiles: uploadFiles,
    uploadLasFiles: lasProcessing.uploadLasFiles,
    uploadCSVFile: csvProcessing.uploadCSVFile,
    uploadDlisFiles: dlisProcessing.parseDlisFiles
};
