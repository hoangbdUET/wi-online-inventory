'use strict'

const AWS = require('aws-sdk');
const config = require('config');
const fs = require('fs');
const credentials = new AWS.SharedIniFileCredentials({profile: 'wi_inventory'});
AWS.config.credentials = credentials;
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const bucket = config.s3Bucket;

function upload(path, key) {
    const fileSystemPath = path;

    const fileStream = fs.createReadStream(fileSystemPath);
    fileStream.on('error', function (err) {
        console.log('File Error', err);
    });
    const uploadParams = {Bucket: bucket, Key: key, Body: fileStream};

    return new Promise((resolve, reject)=> {
        s3.upload(uploadParams, function (err, data) {
            if (err) {
                console.log("Error", err);
                reject(err);
            }
            if (data) {
                fs.unlink(fileSystemPath, (err) => {
                    if(err) console.log("failed to remove curve: " + err);
                })
                resolve(data);
            }
        });
    })
}

function deleteCurve(key) {
    const params = {
        Bucket: bucket,
        Key: key
    }
    s3.deleteObject(params, (err, data) => {
        if(err) console.log("s3 delete object failed " + err);
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

async function getData(key) {
    console.log('~~~ getCurveDataFromS3: ' + key);
    let params = {
        Bucket: bucket,
        Key: key
    }
    return new Promise((resolve, reject) => {
        s3.headObject(params, (err, data) => {
            if(err) reject(err);
            else resolve(s3.getObject(params).createReadStream());
        })
    })
}

module.exports = {
    upload: upload,
    deleteCurve: deleteCurve,
    copyCurve: copyCurve,
    moveCurve: moveCurve,
    getData: getData
}
