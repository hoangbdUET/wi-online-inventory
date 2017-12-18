"use strict";

let hashDir = require('./source/hash-dir');
let extractLAS2 = require("./source/extractors/las2/las2-extractor");
let extractLAS3 = require("./source/extractors/las3/las3-extractor");
let extractAscii = require("./source/extractors/ascii/ascii-extractor");
let extractCSV = require("./source/extractors/csv/csv-extractor");
let decoding = require("./source/extractors/crypto-file/decrypto");
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

module.exports.extractLAS2 = function (inputURL, importData, callback) {
    extractLAS2.extractAll(inputURL, importData, function (err, result) {
        if (err) return callback(err, null);
        callback(false, result);
    });
};

module.exports.extractCurveLAS2 = function (inputURL) {
    extractLAS2.extractCurves(inputURL);
};

module.exports.extractLAS3 = function (inputURL, importData, callback) {
    console.log("Extract all 3.0 ");
    extractLAS3.extractCurves(inputURL, importData, function (err, result) {
        //console.log(result);
        if (err) {
            callback(err, null);
        } else {
            callback(false, result);
        }
    });
}

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
