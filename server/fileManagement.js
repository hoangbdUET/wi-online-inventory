'use strict'

const fs = require('fs')
const hash_dir = require('wi-import').hashDir;
const config = require('config');
const s3 = require('./s3');

async function moveCurveFile(oldCurve, newCurve) {
    try {
        let srcKey = "";
        if(oldCurve.path && !(process.env.INVENTORY_S3PATH || config.s3Path)){
            srcKey = oldCurve.path;
        }else {
            const srcHashStr = oldCurve.username + oldCurve.wellname + oldCurve.datasetname + oldCurve.curvename + oldCurve.unit + oldCurve.step;
            srcKey = hash_dir.getHashPath(srcHashStr) + oldCurve.curvename + '.txt';
        }
        const desHashStr = newCurve.username + newCurve.wellname + newCurve.datasetname + newCurve.curvename + newCurve.unit + newCurve.step;
        const desPath = hash_dir.createPath(process.env.INVENTORY_DATAPATH || config.dataPath, desHashStr, newCurve.curvename + '.txt');
        const desKey = desPath.replace(process.env.INVENTORY_DATAPATH || config.dataPath + '/', '');
        if (process.env.INVENTORY_S3PATH || config.s3Path) {
            s3.moveCurve(srcKey, desKey);
        } else {
            fs.renameSync((process.env.INVENTORY_DATAPATH || config.dataPath) + '/' + srcKey, desPath);
        }
        return desKey;
    } catch (err) {
        console.log(err);
        return null;
    }
}

function moveDatasetFiles(changeSet) {
    let output = []
    changeSet.curves.forEach(curve => {
        const oldCurve = {
            username: changeSet.username,
            wellname: changeSet.wellname,
            datasetname: changeSet.oldDatasetName,
            curvename: curve.name
        };
        const newCurve = Object.assign({}, oldCurve);
        newCurve.datasetname = changeSet.newDatasetName;
        output.push({
            idCurve: curve.idCurve,
            path: moveCurveFile(oldCurve, newCurve)
        });
    });
    return output;
}

function moveWellFiles(changeSet) {
    let output = [];
    changeSet.datasets.forEach(dataset => {
        dataset.curves.forEach(curve => {
            curve.curve_revisions.forEach(revision => {
                const oldCurve = {
                    username: changeSet.username,
                    wellname: changeSet.oldWellName,
                    datasetname: dataset.name,
                    curvename: curve.name,
                    unit: revision.unit,
                    step: revision.step
                };
                const newCurve = Object.assign({}, oldCurve);
                newCurve.wellname = changeSet.newWellName;
                output.push({
                    idCurve: curve.idCurve,
                    path: moveCurveFile(oldCurve, newCurve)
                });
            })
        })
    });
    return output;
}

module.exports = {
    moveCurveFile: moveCurveFile,
    moveDatasetFiles: moveDatasetFiles,
    moveWellFiles: moveWellFiles
};
