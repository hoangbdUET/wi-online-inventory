'use strict'

const fs = require('fs')
const hash_dir = require('../extractors/hash-dir');
const config = require('config');

module.exports.moveCurveFile = function moveCurveFile(oldCurve, newCurve) {
    const srcPath = config.dataPath + '/' + hash_dir.getHashPath(oldCurve.username + oldCurve.wellname + oldCurve.datasetname + oldCurve.curvename) + oldCurve.curvename + '.txt';
    const desPath = hash_dir.createPath(config.dataPath, newCurve.username + newCurve.wellname + newCurve.datasetname + newCurve.curvename, newCurve.curvename + '.txt');
    fs.renameSync(srcPath, desPath);
    return desPath.replace(config.dataPath + '/', '');
}
