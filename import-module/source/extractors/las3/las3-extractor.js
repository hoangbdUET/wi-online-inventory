'use strict';
let readline = require('line-by-line');
// let async = require('async');
let hashDir = require('../../hash-dir');
// let CONFIG = require('../crypto-file/crypto.config').CONFIG;
let fs = require('fs');
let __config = require('../common-config');
// const cryptorFile = require('file-encryptor');
const uploadCurveToS3 = require('../uploadToS3');
let config = require('config');

function writeToCurveFile(buffer, curveFileName, index, value, defaultNull) {
    buffer.count += 1;
    if (value == defaultNull) {
        buffer.data += index + " null" + "\n";
    }
    else {
        buffer.data += index + " " + value + "\n";
    }
    if (buffer.count >= 1000) {
        fs.appendFileSync(curveFileName, buffer.data);
        buffer.count = 0;
        buffer.data = "";
    }
}

function findDataset(dataset){
    return dataset.name == this.datasetname;
}

function extractCurves(inputURL, importData, callback) {
    let rl = new readline(inputURL);
    let sectionName = "";
    let datasets = [];
    let curves = [];
    let count = 0;
    let wellInfo = importData.well ? importData.well : new Object();
    let filePaths = new Object();
    let BUFFERS = new Object();
    rl.on('line', function (line) {
        line = line.trim();
        line = line.toUpperCase();
        line = line.replace(/\s+\s/g, " ");
        if (/^~/.test(line)) {
            sectionName = line;
            if (/_DEFINITION/.test(sectionName) && !/DATA/.test(sectionName)) {
                let datasetName = sectionName.substring(1, sectionName.indexOf("_DEFINITION"));
                let dataset = {
                    name: datasetName,
                    datasetKey: datasetName,
                    datasetLabel: datasetName,
                    curves: []
                }
                datasets.push(dataset);
            } else if (/^~ASCII/.test(sectionName)) {

            }
        } else if (/^[A-z]/.test(line)) {
            if (/WELL/.test(sectionName)) {
                if(importData.well) return;
                if (/WELL/.test(line) && !/UWI/.test(line)) {
                    wellInfo.name = line.substring(line.indexOf('.') + 1, line.indexOf(':')).trim();
                } else if (/STRT/.test(line)) {
                    wellInfo.start = line.substring(line.indexOf('.') + 2, line.indexOf(':')).trim();
                } else if (/STOP/.test(line)) {
                    wellInfo.stop = line.substring(line.indexOf('.') + 2, line.indexOf(':')).trim();
                } else if (/STEP/.test(line)) {
                    wellInfo.step = line.substring(line.indexOf('.') + 2, line.indexOf(':')).trim();
                } else if (/NULL/.test(line)) {
                    wellInfo.null = line.substring(line.indexOf('.') + 1, line.indexOf(':')).trim();
                }
            } else if (/~CURVE/.test(sectionName)) {
                let curve = new Object();
                let curveName = line.substring(0, line.indexOf('.')).trim();
                let unit = line.substring(line.indexOf('.') + 1, line.indexOf(':')).trim();
                curve.name = curveName;
                curve.unit = unit;
                curve.datasetname = wellInfo.name;
                curve.wellname = wellInfo.name;
                curve.initValue = "abc";
                curve.family = "VNU";
                curve.idDataset = null;
                if (!/DEPTH/.test(curve.name)) {

                    BUFFERS[curveName] = {
                        count: 0,
                        data: ""
                    };
                    filePaths[curveName] = hashDir.createPath(__config.basePath, importData.userInfo.username + wellInfo.name + curve.datasetname + curveName, curveName + '.txt');
                    fs.writeFileSync(filePaths[curveName], "");
                    curve.path = filePaths[curveName];
                    curves.push(curve);
                }
            } else if (/_DEFINITION/.test(sectionName) && !/_DATA/.test(sectionName)) {
                //
                count = 0;
                let datasetName = sectionName.substring(1, sectionName.indexOf("_DEFINITION"));
                let curve = new Object();
                let curveName = line.substring(0, line.indexOf('.')).trim();
                let unit = line.substring(line.indexOf('.') + 1, line.indexOf(':')).trim();
                curve.name = curveName;
                curve.unit = unit;
                curve.datasetname = datasetName;
                curve.wellname = wellInfo.name;
                curve.initValue = "abc";
                curve.family = "VNU";
                curve.idDataset = null;
                if (!/DEPTH/.test(curve.name)) {
                    BUFFERS[curveName] = {
                        count: 0,
                        data: ""
                    };
                    curve.datasetname = datasetName;
                    filePaths[curveName] = hashDir.createPath(__config.basePath,importData.userInfo.username + wellInfo.name + curve.datasetname + curveName, curveName + '.txt');
                    fs.writeFileSync(filePaths[curveName], "");
                    curve.path = filePaths[curveName];
                    curves.push(curve);
                }
            } else {

            }
        } else if (/^[0-9][0-9]/.test(line) && /^~ASCII/.test(sectionName)) {
            let spacePosition = line.indexOf(' ');
            line = line.substring(spacePosition, line.length).trim();

            let fields = line.split(' ');
            if (curves) {
                curves.forEach(function (curve, i) {
                    writeToCurveFile(BUFFERS[curve.name], curve.path, count, fields[i], wellInfo.null);
                });
                count++;
            }
        } else if (/^[0-9][0-9]/.test(line) && /_DATA/.test(sectionName)) {
            line = line.replace(new RegExp(" ", 'g'), "");
            let comaPosition = line.indexOf(',');
            line = line.substring(comaPosition + 1, line.length);
            let fields = line.split(',');
            if (curves) {
                curves.forEach(function (curve, i) {
                    writeToCurveFile(BUFFERS[curve.name], curve.path, count, fields[i], wellInfo.null);
                });
                count++;
            }
        }

    });
    rl.on('end', function () {
        deleteFile(inputURL);

        if (datasets.length > 0) {
            curves.forEach((curve)=>{
                fs.appendFileSync(curve.path, BUFFERS[curve.name].data);
                curve.path = curve.path.replace(config.dataPath + '/', '');
                if(config.s3Path) {
                    uploadCurveToS3(curve);
                }
                let curveDataset = datasets.find(findDataset, curve);
                curveDataset.curves.push(curve);
            })
        } else {
            let dataset = {
                name: wellInfo.name,
                datasetKey: wellInfo.name,
                datasetLabel: wellInfo.name,
                curves: []
            }
            for (let i = 0; i < curves.length; i++) {
                dataset.curves.push(curves[i]);
            }
            datasets.push(dataset);
        }

        wellInfo.datasetInfo = datasets;
        callback(false, wellInfo);
        //console.log("ExtractLAS3 Done");
    });
    rl.on('err', function (err) {
        console.log(err);
        deleteFile(inputURL);
        callback(err, null);
    });
}

function extractInfoOnly(inputURL, callback) {
    let result = {};
    let rl = new readline(inputURL);
    let sectionName = "";
    let datasets = [];
    let curves = [];
    let count = 0;
    let wellInfo = new Object();
    let filePaths = new Object();
    let BUFFERS = new Object();
    //console.log("FILE : " + inputURL);
    rl.on('line', function (line) {
        line = line.trim();
        line = line.toUpperCase();
        line = line.replace(/\s+\s/g, " ");
        if (/^~/.test(line)) {
            sectionName = line;
            if (/_DEFINITION/.test(sectionName) && !/DATA/.test(sectionName)) {
                let datasetName = sectionName.substring(1, sectionName.indexOf("_DEFINITION"));
                let dataset = {
                    name: datasetName,
                    datasetKey: datasetName,
                    datasetLabel: datasetName,
                    curves: []
                }
                datasets.push(dataset);
            } else if (/^~ASCII/.test(sectionName)) {

            }
        } else if (/^[A-z]/.test(line)) {
            if (/WELL/.test(sectionName)) {
                let wellName = "";
                let start = "";
                let stop = "";
                let step = "";
                let NULL = "";
                if (/WELL/.test(line) && !/UWI/.test(line)) {
                    wellName = line.substring(line.indexOf('.') + 1, line.indexOf(':')).trim();
                    //console.log("WELL NAME : " + wellName);
                    wellInfo.name = wellName;
                } else if (/STRT/.test(line)) {
                    start = line.substring(line.indexOf('.') + 2, line.indexOf(':')).trim();
                    wellInfo.start = start;
                } else if (/STOP/.test(line)) {
                    stop = line.substring(line.indexOf('.') + 2, line.indexOf(':')).trim();
                    wellInfo.stop = stop;
                } else if (/STEP/.test(line)) {
                    step = line.substring(line.indexOf('.') + 2, line.indexOf(':')).trim();
                    wellInfo.step = step;
                } else if (/NULL/.test(line)) {
                    NULL = line.substring(line.indexOf('.') + 1, line.indexOf(':')).trim();
                    wellInfo.null = NULL;
                }
                result.wellinfo = wellInfo;
            } else if (/~CURVE/.test(sectionName)) {
                //curve info;
                let curve = new Object();
                let curvename = "";
                let unit = "";
                curveName = line.substring(0, line.indexOf('.')).trim();
                unit = line.substring(line.indexOf('.') + 1, line.indexOf(':')).trim();
                curve.name = curveName;
                curve.unit = unit;
                curve.datasetname = wellInfo.name;
                curve.wellname = wellInfo.name;
                if (!/DEPTH/.test(curve.name)) {
                    curves.push(curve);
                }
            } else if (/_DEFINITION/.test(sectionName) && !/_DATA/.test(sectionName)) {
                //
                count = 0;
                let datasetName = sectionName.substring(1, sectionName.indexOf("_DEFINITION"));
                let curve = new Object();
                let unit = "";
                let curvename = "";
                curveName = line.substring(0, line.indexOf('.')).trim();
                unit = line.substring(line.indexOf('.') + 1, line.indexOf(':')).trim();
                curve.name = curveName;
                curve.unit = unit;
                curve.datasetname = datasetName;
                curve.wellname = wellInfo.name;
                if (!/DEPTH/.test(curve.name)) {
                    curves.push(curve);
                }
            } else {

            }
        }

    });
    rl.on('end', function () {
        //result.curves = curves;
        deleteFile(inputURL);
        if (datasets.length > 0) {
            datasets.forEach(function (dataset) {
                for (let i = 0; i < curves.length; i++) {
                    if (curves[i].datasetname == dataset.name) {
                        dataset.curves.push(curves[i]);
                    }
                }
            });
        } else {
            let dataset = {
                name: wellInfo.name,
                datasetKey: wellInfo.name,
                datasetLabel: wellInfo.name,
                curves: []
            }
            for (let i = 0; i < curves.length; i++) {
                dataset.curves.push(curves[i]);

            }
            datasets.push(dataset);
        }
        wellInfo.datasetInfo = datasets;
        callback(false, wellInfo);

    });
    rl.on('err', function (err) {
        console.log(err);
        deleteFile(inputURL);
        callbac(err, null);
    })
}

function extractAll(inputURL, callback) {
    extractCurves(inputURL);
}

function deleteFile(inputURL) {
    fs.unlink(inputURL, function (err) {
        if (err) return console.log(err);
    });
}


module.exports.extractCurves = extractCurves;
module.exports.extractInfoOnly = extractInfoOnly;
module.exports.extractAll = extractAll;
module.exports.deleteFile = deleteFile;
module.exports.setBasePath = function (basePath) {
    __config.basePath = basePath;
};

module.exports.getBasePath = function () {
    return __config.basePath;
};

