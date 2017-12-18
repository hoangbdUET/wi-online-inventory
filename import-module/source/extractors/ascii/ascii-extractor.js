'use strict'

const readline = require('line-by-line');
const fs = require('fs');
let hashDir = require('../../hash-dir');
const config = require('config');

function writeToCurveFile(buffer, curveFilePath, index, value, defaultNull) {
    buffer.count ++;
    if (value == defaultNull) {
        buffer.data += index + " null" + "\n";
    }
    else {
        buffer.data += index + " " + value + "\n";
    }
    if (buffer.count >= 1000) {
        fs.appendFileSync(curveFilePath, buffer.data);
        buffer.count = 0;
        buffer.data = "";
    }
}

function extractCurves(file, importData, cb) {

    //importData.well
    //importData.dataset
    //importData.columnFormat = 1/2/3/4
    //importData.curveNameStartAt
    //importData.curveUnitStartAt
    //importData.curveDataStartAt
    //importData.userInfo.username
    console.log('extractCurves');

    const fileName = file.originalname.substring(0, file.originalname.lastIndexOf('.'));
    const fileFormat = file.originalname.substring(file.originalname.lastIndexOf('.') + 1);

    console.log(fileName + '     ' + fileFormat);

    if(fileFormat != 'csv' && fileFormat != 'asc') return cb('This is not csv or asc file');

    let rl = new readline(file.path);
    let wellName = importData.well ? importData.well.name : fileName;
    let datasetName = importData.dataset ? importData.dataset.name : fileName;
    let lineNumber = 0;
    let curves = [];
    let count = 0;
    let buffers = {};

    let startColumn = 1;
    switch (importData.columnFormat){
        case 1:
            startColumn = 1;
            break;
        case 2:
        case 3:
            startColumn = 2;
            break;
        case 4:
            startColumn = 3;
            break;
    }

    let separator = fileFormat == 'csv' ? ',' : /\s|,/;


    rl.on('line', line => {
        lineNumber++;
        line = line.trim();
        // line = line.replace(/\s+\s/g, " ");

        if(lineNumber >= importData.curveDataStartAt){
            count ++;
            let curvesData = line.split(separator);
            curves.forEach((curve, i) => {
                writeToCurveFile(buffers[curve.name], curve.path, count, curvesData[i + startColumn], -9999);
            })
        }
        else if (lineNumber >= importData.curveUnitStartAt){
            let curvesUnit = line.split(separator);
            curvesUnit.splice(0, startColumn);
            for(let i = 0; i < curves.length; i++){
                curves[i].unit = curvesUnit[i];
            }
        }
        else if(lineNumber >= importData.curveNameStartAt) {
            let curvesName = line.split(separator);
            curvesName.splice(0, startColumn);
            curvesName.forEach(curveName => {
                let filePath = hashDir.createPath(config.dataPath,importData.userInfo.username + wellName + datasetName + curveName, curveName + '.txt');
                fs.writeFileSync(filePath, "");
                let curve = {
                    name: curveName,
                    datasetname: datasetName,
                    path: filePath
                }
                buffers[curveName] = {
                    count: 0,
                    data: ""
                }
                // console.log(filePath);
                curves.push(curve);
            })
        }
    })

    rl.on('end', () => {
        if (curves) {
            curves.forEach(function (curve) {
                fs.appendFileSync(curve.path, buffers[curve.name].data);
            });
        }
        let well = importData.well ? importData.well : { name : wellName};
        well.dataset = importData.dataset ? importData.dataset : { name : datasetName};
        well.dataset.curves = curves;
        cb(null, well);
    })
}


module.exports = {
    extractCurves: extractCurves
}