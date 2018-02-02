'use strict'

const fs = require('fs')
const hash_dir = require('../extractors/hash-dir');
const config = require('config');
const s3 = require('./s3');

async function moveCurveFile(oldCurve, newCurve) {
    try {
        const srcHashStr = oldCurve.username + oldCurve.wellname + oldCurve.datasetname + oldCurve.curvename + oldCurve.unit + oldCurve.step;
        const srcKey = hash_dir.getHashPath(srcHashStr) + oldCurve.curvename + '.txt';
        const desHashStr = newCurve.username + newCurve.wellname + newCurve.datasetname + newCurve.curvename + newCurve.unit + newCurve.step;

        const desPath = hash_dir.createPath(config.dataPath, desHashStr, newCurve.curvename + '.txt');
        const desKey = desPath.replace(config.dataPath + '/', '');
        if(config.s3Path){
            s3.moveCurve(srcKey, desKey);
        }else {
            fs.renameSync(config.dataPath + '/' + srcKey, desPath);
        }
        return desKey;
    }catch (err){
        console.log(err);
        return null;
    }
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
            curve.curve_revisions.forEach(revision => {
                const oldCurve = {
                    username: changeSet.username,
                    wellname: changeSet.oldWellName,
                    datasetname: dataset.name,
                    curvename: curve.name,
                    unit: revision.unit,
                    step: revision.step
                }
                const newCurve = Object.assign({}, oldCurve);
                newCurve.wellname = changeSet.newWellName;
                output.push({
                    idCurve: curve.idCurve,
                    path: moveCurveFile(oldCurve, newCurve)
                });
            })
        })
    })
    return output;
}

module.exports = {
    moveCurveFile: moveCurveFile,
    moveDatasetFiles: moveDatasetFiles,
    moveWellFiles: moveWellFiles
}
