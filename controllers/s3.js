'use strict'

const AWS = require('aws-sdk');
const config = require('config');
const fs = require('fs');
const credentials = new AWS.SharedIniFileCredentials({profile: 'wi_inventory'});
AWS.config.credentials = credentials;
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const bucket = 'wi-inventory';

function upload(curve) {
    const fileSystemPath = config.dataPath + '/' + curve.path;

    let uploadParams = {Bucket: bucket, Key: '', Body: ''};

    const fileStream = fs.createReadStream(fileSystemPath);
    fileStream.on('error', function (err) {
        console.log('File Error', err);
    });
    uploadParams.Body = fileStream;
    uploadParams.Key = curve.path;

    return new Promise((resolve, reject)=> {
        s3.upload(uploadParams, function (err, data) {
            if (err) {
                console.log("Error", err);
                reject(err);
            }
            if (data) {
                console.log("Upload Success", data.Location);
                fs.unlink(fileSystemPath, (err) => {
                    if(err) console.log("failed to remove curve: " + err);
                })
                resolve();
            }
        });
    })
}

function deleteCurve(curve) {
    const curveName = curve.path.slice(curve.path.lastIndexOf('/') + 1, curve.path.length);
    const dir = curve.path.slice(0, curve.path.lastIndexOf('/') + 1);
    const params = {
        Bucket: bucket,
        Delimiter: '/',
        Prefix: dir
    }
    s3.listObjects(params, (err, data) => {
        let deleteParams = {
            Bucket: bucket,
            Delete: {Objects:[]}
        }
        data.Contents.forEach((content) => {
            if(content.Key.indexOf(curveName) != -1) {
                console.log(content.Key + ' will be deleted.');
                deleteParams.Delete.Objects.push({Key: content.Key});
            }
        })

        s3.deleteObjects(deleteParams, (err)=>{
            if(err) console.log("s3 delete object failed " + err);
            else console.log("s3 delete object done");
        })
    })
}

function copyCurve(srcKey, desKey) {

    const params = {
        Bucket: bucket,
        CopySource: '/' +  bucket + '/' + srcKey,
        Key: desKey
    };

    s3.copyObject(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
    });
}

function moveCurve(srcKey, desKey) {
    const params = {
        Bucket: bucket,
        CopySource: '/' +  bucket + '/' + srcKey,
        Key: desKey
    };

    s3.copyObject(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            console.log(data);
            let deleteParams = {
                Bucket: bucket,
                Delete: {Objects:[{Key: srcKey}]}
            }
            s3.deleteObjects(deleteParams, (err)=>{
                if(err) console.log("s3 delete object failed " + err);
                else console.log("s3 delete object done");
            });
        }           // successful response
    });
}

function getData(key) {
    console.log('~~~getCurveDataFromS3~~~');
    let params = {
        Bucket: "wi-inventory",
        Key: key
    }

    let readStream = s3.getObject(params).createReadStream();
    return readStream;
}

module.exports = {
    upload: upload,
    deleteCurve: deleteCurve,
    copyCurve: copyCurve,
    moveCurve: moveCurve,
    getData: getData
}