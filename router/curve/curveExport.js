'use strict'

const lineReader = require('line-by-line');
const unitConversion = require('./unitConversion');
const fs = require('fs');
const AWS = require('aws-sdk');
const config = require('config');

let credentials = new AWS.SharedIniFileCredentials({profile: 'wi_inventory'});
AWS.config.credentials = credentials;
let s3 = new AWS.S3({apiVersion: '2006-03-01'});


function writeToCurveFile(buffer, curveFileName, index, value, defaultNull) {
    buffer.count += 1;
    if (value == defaultNull) {
        buffer.data += index + " null" + "\n";
    }
    else {
        buffer.data += index + " " + value + "\n";
    }
    if (buffer.count >= 1000 || buffer.end == true) {
        fs.appendFileSync(curveFileName, buffer.data);
        buffer.count = 0;
        buffer.data = "";
    }
}

function getCurveDataFromS3(path) {
    console.log('~~~getCurveDataFromS3~~~');
    let params = {
        Bucket: "wi-inventory",
        Key: path
    }

    let readStream = s3.getObject(params).createReadStream();
    return readStream;
}

function convertCurve(path, originUnit, newUnit, callback) {
    console.log('~~~convertCurve~~~');
    let fileName = path.substring(path.lastIndexOf('/') + 1, path.length);
    let newPath = path.substring(0, path.lastIndexOf('/') + 1) + newUnit + '_' + fileName;
    console.log("path: " + path);
    console.log("newPath: " + newPath);
    let lr = new lineReader(path);
    let buffer = new Object();
    buffer.count = 0;
    buffer.data = '';
    buffer.end = false;
    let index = 0;

    lr.on('error', function (err) {
        console.log('loi roi: ' + err);
    });

    lr.on('line', function (line) {
        let value = parseFloat(line.trim().split(' ')[1]);
        writeToCurveFile(buffer, newPath, index, unitConversion.convert(value, originUnit, newUnit), -9999);
        index++;
    });

    lr.on('end', function () {
        fs.appendFileSync(newPath, buffer.data);
        callback(null, newPath);
    });
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
                    let tempPath =  fs.mkdtempSync(require('os').tmpdir());
                    console.log('tempPath: ' + tempPath);
                    let originUnitFileOnDisk = tempPath + '/' + curve.alias + '.txt';

                    let wstream = fs.createWriteStream(originUnitFileOnDisk);
                    getCurveDataFromS3(curve.path).pipe(wstream);
                    wstream.on('finish', () => {
                        console.log('----------');
                        convertCurve(originUnitFileOnDisk, curve.unit, unit, (err, path)=> {
                            if(!err){
                                console.log('convert done!!!');
                                fs.unlink(originUnitFileOnDisk);
                                let uploadParams = {
                                    Bucket: 'wi-inventory',
                                    Key: filePath,
                                    Body: fs.createReadStream(path)
                                };
                                s3.upload(uploadParams, (err, data)=> {
                                    console.log('upload done!!!');
                                    if(!err) {
                                        callback(null, getCurveDataFromS3(filePath));
                                        fs.unlink(path, ()=>{
                                            fs.rmdir(tempPath, ()=>{});
                                        });
                                    }
                                })
                            }
                        })
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
                convertCurve(curve.path, curve.unit, unit, (err, path)=> {
                    if(!err) callback(null, fs.createReadStream(path));
                })
            }
        }
    }
}
