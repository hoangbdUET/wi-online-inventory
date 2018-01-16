'use strict'

const readline = require('line-by-line');
const fs = require('fs');
let hashDir = require('../hash-dir');
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

function extractCurves(inputFile, importData, cb) {
    const fileName = file.originalname.substring(0, file.originalname.lastIndexOf('.'));
    const fileFormat = file.originalname.substring(file.originalname.lastIndexOf('.') + 1);

    const rl = new readline(inputFile.path, {skipEmptyLines : true});
    let curves = [];
    let wells = [];
    let currentWell = importData.well? importData.well : { name : ''};
    let isFirstLine = true;
    let count = 1;
    let BUFFERS = new Object();

    rl.on('line', line => {
        line = line.trim();
        const lineSplited = line.split(',');

        if(isFirstLine){
            isFirstLine = false;
            curves = lineSplited.slice(2);
            console.log(curves.join(','));
        }
        else {
            if(lineSplited[0] != currentWell.name){
                wells.push(currentWell);
                let dataset = {
                    name: lineSplited[0],
                    curves: []
                }
                curves.forEach(curveName => {
                    const path = ;
                    let curve = {
                        name: curveName,
                    }
                    dataset.curves.push(curve);
                })
                currentWell = {
                    name: lineSplited[0],
                    filename: fileName,
                    datasets: [dataset]
                }
                count = 1;
            }
            else {
                curves.forEach((curve, i) => {
                    // writeToCurveFile(BUFFERS[curve.name], curve.path, count, lineSplited[i + 2], wellInfo.NULL);
                })
                count++;
            }
        }
    })

    rl.on('end', () => {

    })
}


let file = {
    path: '/Users/dodang/uet_work/backend/Coredatawell_7-9-10.csv',
    originalname: 'Coredatawell_7-9-10.csv'
}
let importData = {
    username: 'dodv'
}
extractCurves(file, importData);