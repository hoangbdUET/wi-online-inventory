'use strict'

const fs = require('fs')
const hash_dir = require('../extractors/hash-dir');
const config = require('config');

function moveCurveFile(oldCurve, newCurve) {
    const srcPath = config.dataPath + '/' + hash_dir.getHashPath(oldCurve.username + oldCurve.wellname + oldCurve.datasetname + oldCurve.curvename) + oldCurve.curvename + '.txt';
    const desPath = hash_dir.createPath(config.dataPath, newCurve.username + newCurve.wellname + newCurve.datasetname + newCurve.curvename, newCurve.curvename + '.txt');
    fs.renameSync(srcPath, desPath);
    return desPath.replace(config.dataPath + '/', '');
}

function moveDatasetFiles(changeSet) {
    //changeSet.username
    //changeSet.wellname
    //changeSet.oldDatasetName
    //changeSet.newDatasetName
    //changeSet.curves = []
    let output = []
    changeSet.curves.forEach(curve => {
        const oldCurve = {
            username: changeSet.username,
            wellname: changeSet.wellname,
            datasetname: changeSet.oldDatasetName,
            curvename: curve.name
        }
        const newCurve = Object.assign({}, oldCurve);
        newCurve.datasetname = changeSet.newDatasetName;
        output.push({
            idCurve: curve.idCurve,
            path: moveCurveFile(oldCurve, newCurve)
        });
    })
    return output;
}

function moveWellFiles(changeSet) {
    //changeSet.username
    //changeSet.oldWellName
    //changeSet.newWellName
    //changeSet.datasets
    let output = [];
    changeSet.datasets.forEach(dataset => {
        dataset.curves.forEach(curve=> {
            const oldCurve = {
                username: changeSet.username,
                wellname: changeSet.oldWellName,
                datasetname: dataset.name,
                curvename: curve.name
            }
            const newCurve = Object.assign({}, oldCurve);
            newCurve.wellname = changeSet.newWellName;
            output.push({
                idCurve: curve.idCurve,
                path: moveCurveFile(oldCurve, newCurve)
            });
        })
    })
    return output;
}

module.exports = {
    moveCurveFile: moveCurveFile,
    moveDatasetFiles: moveDatasetFiles,
    moveWellFiles: moveWellFiles
}
