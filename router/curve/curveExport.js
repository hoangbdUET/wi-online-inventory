'use strict'

const unitConversion = require('./unitConversion');
const fs = require('fs');
const AWS = require('aws-sdk');
const config = require('config');
const readline = require('readline');

let credentials = new AWS.SharedIniFileCredentials({profile: 'wi_inventory'});
AWS.config.credentials = credentials;
let s3 = new AWS.S3({apiVersion: '2006-03-01'});


function getCurveDataFromS3(path) {
    console.log('~~~getCurveDataFromS3~~~');
    let params = {
        Bucket: "wi-inventory",
        Key: path
    }

    let readStream = s3.getObject(params).createReadStream();
    return readStream;
}

function convertCurve(curve, newUnit, callback) {
    console.log('~~~convertCurve~~~');
    let index = 0;

    if(config.s3Path){
        let tempPath =  fs.mkdtempSync(require('os').tmpdir());
        let newKey = curve.path.substring(0, curve.path.lastIndexOf('/') + 1) + newUnit + '_' + curve.alias + '.txt';
        let pathOnDisk = tempPath + '/' + newUnit + '_' + curve.alias + '.txt';
        const writeStream = fs.createWriteStream(pathOnDisk);
        const rl = readline.createInterface({
            input: getCurveDataFromS3(curve.path)
        })
        rl.on('line', (line) => {
            writeStream.write(index + ' ' + unitConversion.convert(parseFloat(line.trim().split(' ')[1]), curve.unit, newUnit) + '\n');
            index++;
        })
        rl.on('close', ()=> {
            let uploadParams = {
                Bucket: 'wi-inventory',
                Key: newKey,
                Body: fs.createReadStream(pathOnDisk)
            };
            s3.upload(uploadParams, (err, data)=> {
                console.log('upload done!!!');
                if(!err) {
                    callback(null, newKey);
                    fs.unlink(pathOnDisk, ()=>{
                        fs.rmdir(tempPath, ()=>{});
                    });
                }
            })
        })
    }
    else {
        let newPath = curve.path.substring(0, curve.path.lastIndexOf('/') + 1) + newUnit + '_' + curve.alias + '.txt';
        const writeStream = fs.createWriteStream(newPath);
        const rl = readline.createInterface({
            input: fs.createReadStream(curve.path)
        })
        rl.on('line', (line) => {
            writeStream.write(index + ' ' + unitConversion.convert(parseFloat(line.trim().split(' ')[1]), curve.unit, newUnit) + '\n');
            index++;
        })
        rl.on('close', ()=> {
            callback(null, newPath);
        })
    }
}

module.exports = function (curve, unit, callback) {
    console.log('~~~curveExport~~~');
    console.log('config.s3Path: ' + config.s3Path);
    console.log('curvePath: ' + curve.path);
    if (!unit || unit == curve.unit){
        if(config.s3Path){
            callback(null, getCurveDataFromS3(curve.path));
        }
        else {
            callback(null, fs.createReadStream(curve.path));
        }
    } else {
        let filePath = curve.path.substring(0, curve.path.lastIndexOf('/') + 1) + unit + '_' + curve.alias + '.txt';
        console.log('filePath: ' + filePath);
        if(config.s3Path){
            let params = {
                Bucket: "wi-inventory",
                Key: filePath
            }
            s3.headObject(params, (err, data) => {
                if(err && err.code == 'NotFound'){
                    console.log('file with ' + unit + ' does not exists');
                    console.log('curvePath: ' + curve.path);

                    convertCurve(curve, unit, (err, path)=> {
                        if(!err){
                            console.log('convert done!!!');
                            callback(null, getCurveDataFromS3(path));
                        }
                    })
                } else {
                    console.log('file with ' + unit + ' exists');
                    return callback(null, getCurveDataFromS3(filePath));
                }
            })
        }
        else {
            if(fs.existsSync(filePath)){
                callback(null, fs.createReadStream(filePath));
            }
            else {
                convertCurve(curve, unit, (err, path)=> {
                    if(!err) callback(null, fs.createReadStream(path));
                    else console.log(err);
                })
            }
        }
    }
}
