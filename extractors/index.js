"use strict";

let hashDir = require('./hash-dir');
let extractLAS2 = require("./las2/las2-extractor");
let extractLAS3 = require("./las3/las3-extractor");
let extractAscii = require("./ascii/ascii-extractor");
let extractCSV = require("./csv/csv-extractor");
let decoding = require("./crypto-file/decrypto");
module.exports.setBasePath = function (path) {
    extractLAS2.setBasePath(path);
    // extractASC.setBasePath(path);
};

module.exports.getBasePath = function (path) {
    return extractLAS2.getBasePath();
};

module.exports.extractWellLAS2 = function (inputURL, callback) {
    extractLAS2.extractWell(inputURL, function (err, result) {
        if (err) return callback(err, null);
        callback(false, result);
    });
};

module.exports.extractLAS = function (inputFile, importData, cb){
    // extractLAS2.extractAll(inputFile, importData, (err, result) => {
    //     if(err) {
    //         if (/LAS_3_DETECTED/.test(err)) {
    //             console.log("this is las 3 file");
    //             extractLAS3.extractCurves(inputFile, importData, function (err, result) {
    //                 if (err) cb(err);
    //                 else cb(null, result);
    //             });
    //         }
    //         else cb(err);
    //     }
    //     else {
    //         cb(null, result);
    //     }
    // })
    extractLAS3.extractCurves(inputFile, importData, function (err, result) {
        if (err) cb(err);
        else cb(null, result);
    });
}


module.exports.extractCurveLAS2 = function (inputURL) {
    extractLAS2.extractCurves(inputURL);
};


module.exports.deleteFile = function (inputURL) {
    extractLAS2.deleteFile(inputURL);
};

module.exports.decoding = function (data) {
    return decoding.decoding(data);
};

// module.exports.extractASC = function (inputURL, callback, options) {
//     extractASC.extractFromASC(inputURL, function (result) {
//         callback(result);
//     }, options);
// };
//
// module.exports.extractCSV = function (inputURL, projectId, wellId) {
//     extractCSV.extractFromCSV(inputURL, projectId, wellId);
// };

module.exports.extractAscii = extractAscii;

module.exports.hashDir = hashDir;
