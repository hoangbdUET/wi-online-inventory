'use strict';
let readline = require('line-by-line');
let hashDir = require('../hash-dir');
let fs = require('fs');
let __config = require('../common-config');
const s3 = require('../../controllers/s3');
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


function extractCurves(inputFile, importData, callback) {
    let rl = new readline(inputFile.path, { skipEmptyLines : true });
    let sectionName = "";
    let datasets = {};
    let count = 0;
    let wellInfo = importData.well ? importData.well : {filename : inputFile.originalname};
    let filePaths = new Object();
    let BUFFERS = new Object();
    let isFirstCurve = true;
    let fields = [];
    const wellTitle = 'WELL';
    const curveTitle = 'CURVE';
    const definitionTitle = '_DEFINITION';
    const dataTitle = '_DATA';
    const asciiTitle = 'ASCII';

    rl.on('line', function (line) {
        line = line.trim();
        line = line.replace(/\s+\s/g, " ");
        if(/^#/.test(line)){
            return;
        }
        if (/^~/.test(line)) {
            line = line.toUpperCase();
            const firstSpace = line.indexOf(' ');
            const barIndex = line.indexOf('|');
            if(firstSpace != -1 && barIndex != -1) {
                sectionName = line.substring(line.indexOf('~') + 1, firstSpace < barIndex ? firstSpace : barIndex);
            }
            else if(firstSpace != barIndex){
                sectionName = line.substring(line.indexOf('~') + 1, firstSpace > barIndex ? firstSpace : barIndex);
            }
            else {
                sectionName = line.substring(line.indexOf('~') + 1);
            }


            if (new RegExp(definitionTitle).test(sectionName)) {
                isFirstCurve = true;
                let datasetName = sectionName.substring(0, sectionName.indexOf(definitionTitle));
                let dataset = {
                    name: datasetName,
                    // datasetKey: datasetName,
                    // datasetLabel: datasetName,
                    curves: [],
                    top: wellInfo.STRT,
                    bottom: wellInfo.STOP,
                    step: wellInfo.STEP
                }
                datasets[datasetName] = dataset;
            }
            if(sectionName == curveTitle) {
                isFirstCurve = true;
                let dataset = {
                    name: wellInfo.name,
                    curves: [],
                    top: wellInfo.STRT,
                    bottom: wellInfo.STOP,
                    step: wellInfo.STEP
                }
                datasets[wellInfo.name] = dataset;
            }
        } else if(sectionName == wellTitle){
            if(importData.well) return;
            const mnem = line.substring(0, line.indexOf('.')).trim();
            line = line.substring(line.indexOf('.'));
            const data = line.substring(line.indexOf(' '), line.indexOf(':')).trim();

            if ((/WELL/).test(mnem) && !/UWI/.test(mnem)) {
                wellInfo.name = data ? data : inputFile.originalname;
            }
            else {
                wellInfo[mnem] = data;
            }
        } else if(sectionName == curveTitle ||new RegExp(definitionTitle).test(sectionName)){
            if(isFirstCurve){
                isFirstCurve = false;
                return;
            }

            const datasetName = new RegExp(definitionTitle).test(sectionName) ? sectionName.substring(0, sectionName.indexOf(definitionTitle)) : wellInfo.name;
            let curveName = line.substring(0, line.indexOf('.')).trim();
            curveName = curveName.replace('/', '_');
            while (true){
                let rename = datasets[datasetName].curves.every(curve => {
                    if(curveName == curve.name){
                        curveName = curveName + '_1';
                        return false;
                    }
                    return true;
                });
                if(rename) break;
            }
            line = line.substring(line.indexOf('.') + 1);

            let unit = line.substring(0, line.indexOf(' ')).trim();
            if (unit.indexOf("00") != -1) unit = unit.substring(0, unit.indexOf("00"));

            let curve = {
                name : curveName,
                unit : unit,
                datasetname : datasetName,
                startDepth : wellInfo.STRT,
                stopDepth : wellInfo.STOP,
                step : wellInfo.STEP,
            }
            BUFFERS[curveName] = {
                count: 0,
                data: ""
            };
            filePaths[curveName] = hashDir.createPath(__config.basePath,importData.userInfo.username + wellInfo.name + curve.datasetname + curveName, curveName + '.txt');
            // filePaths[curveName] = hashDir.createPath(__config.basePath, new Date().getTime().toString() + curveName , curveName + '.txt');
            fs.writeFileSync(filePaths[curveName], "");
            curve.path = filePaths[curveName];
            datasets[datasetName].curves.push(curve);
        } else if(sectionName == asciiTitle || new RegExp(dataTitle).test(sectionName)){
            let datasetName = sectionName == asciiTitle ? wellInfo.name : sectionName.substring(0, sectionName.indexOf(dataTitle));
            let separator = sectionName == asciiTitle ? ' ' : ',';
            fields = fields.concat(line.trim().split(separator));
            if(fields.length > datasets[datasetName].curves.length) {
                if (datasets[datasetName].curves) {
                    datasets[datasetName].curves.forEach(function (curve, i) {
                        writeToCurveFile(BUFFERS[curve.name], curve.path, count, fields[i + 1], wellInfo.NULL);
                    });
                    count++;
                }
                fields = [];
            }
        }


    });


    rl.on('end', function () {
        deleteFile(inputFile.path);
        let output = [];
        wellInfo.datasets = [];
        for(var datasetName in datasets){
            if(!datasets.hasOwnProperty(datasetName)) continue;
            let dataset = datasets[datasetName];
            wellInfo.datasets.push(dataset);
            dataset.curves.forEach(curve => {
                fs.appendFileSync(curve.path, BUFFERS[curve.name].data);
                curve.path = curve.path.replace(config.dataPath + '/', '');
                if(config.s3Path) {
                    s3.upload(curve);
                }
            })
        }

        // console.log(JSON.stringify(wellInfo));
        output.push(wellInfo);
        callback(false, output);
        //console.log("ExtractLAS3 Done");
    });

    rl.on('err', function (err) {
        console.log(err);
        deleteFile(inputFile.path);
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
        let output = [];
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
        output.push(wellInfo);
        callback(false, output);

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

