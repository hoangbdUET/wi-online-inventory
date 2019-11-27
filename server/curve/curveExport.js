'use strict'

const unitConversion = require('./unitConversion');
const fs = require('fs');
const AWS = require('aws-sdk');
const config = require('config');
const readline = require('readline');
const s3 = require('../s3');
const curveModel = require('./curve.model');

async function convertCurve(curve, newUnit, callback) {
    console.log('~~~convertCurve~~~');
    let index = 0;

    if (process.env.INVENTORY_S3PATH || config.s3Path) {
        let tempPath = fs.mkdtempSync(require('os').tmpdir());
        let newKey = curve.path.substring(0, curve.path.lastIndexOf('/') + 1) + newUnit + '_' + curve.name + '.txt';
        let pathOnDisk = tempPath + '/' + newUnit + '_' + curve.name + '.txt';
        const writeStream = fs.createWriteStream(pathOnDisk);
        const rl = readline.createInterface({
            input: await s3.getData(curve.path)
        })
        rl.on('line', (line) => {
            writeStream.write(index + ' ' + unitConversion.convert(parseFloat(line.trim().split(' ')[1]), curve.unit, newUnit) + '\n');
            index++;
        })
        rl.on('close', () => {
            let uploadParams = {
                Bucket: 'wi-inventory',
                Key: newKey,
                Body: fs.createReadStream(pathOnDisk)
            };
            s3.upload(pathOnDisk, newKey)
                .then(data => {
                    callback(null, newKey);
                    fs.unlink(pathOnDisk, () => {
                        fs.rmdir(tempPath, () => {
                        });
                    });
                }).catch(err => {

            });
        })
    }
    else {
        let newPath = (process.env.INVENTORY_DATAPATH || config.dataPath) + '/' + curve.path.substring(0, curve.path.lastIndexOf('/') + 1) + newUnit + '_' + curve.name + '.txt';
        const writeStream = fs.createWriteStream(newPath);
        const rl = readline.createInterface({
            input: fs.createReadStream((process.env.INVENTORY_DATAPATH || config.dataPath) + '/' + curve.path)
        })
        rl.on('line', (line) => {
            writeStream.write(index + ' ' + unitConversion.convert(parseFloat(line.trim().split(' ')[1]), curve.unit, newUnit) + '\n');
            index++;
        })
        rl.on('close', () => {
            callback(null, newPath);
        })
    }
}

module.exports = function (curve, unit, step, callback) {
    console.log('~~~curveExport~~~');
    console.log('config.s3Path: ' + (process.env.INVENTORY_S3PATH || config.s3Path));
    curve.curve_revisions.forEach(async revision => {
        if (revision.isCurrentRevision) {
            const key = await curveModel.getCurveKey(revision);
            if (process.env.INVENTORY_S3PATH || config.s3Path) {
                console.log("get data from s3")
                s3.getData(key)
                    .then(dataStream => {
                        callback(null, dataStream);
                    }).catch(err => {
                    callback(err);
                })
            }
            else {
                console.log("get data from local")
                if (fs.existsSync((process.env.INVENTORY_DATAPATH || config.dataPath) + '/' + key)) {
                    callback(null, fs.createReadStream((process.env.INVENTORY_DATAPATH || config.dataPath) + '/' + key));
                }
                else {
                    callback('No such file or directory')
                }
            }
        }
    });
};
