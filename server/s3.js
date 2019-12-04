'use strict'

const AWS = require('aws-sdk');
const config = require('config');
const fs = require('fs');
// const credentials = new AWS.SharedIniFileCredentials({profile: 'wi_inventory'});
const credentials = new AWS.Credentials({
    accessKeyId: process.env.INVENTORY_ACCESS_KEY_ID || config.s3AccessKeyId,
    secretAccessKey: process.env.INVENTORY_SECRET_ACCESS_KEY || config.s3SecretAccessKey
});
AWS.config.credentials = credentials;
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const bucket = process.env.INVENTORY_S3BUCKET || config.s3Bucket;
const { spawn } = require('child_process');
const os = require('os');

function upload(path, key, direction) {
    //direction = 0: increasing
    //direction = 1: descreasing
    let fileStream;
    if(!direction) {
        fileStream = fs.createReadStream(path);
    }else {
        if(os.type() == "Linux") {
            fileStream = spawn('tac', [path]).stdout;
        } else if (os.type() == "Darwin") {
            fileStream = spawn('tail', ['-r', path]).stdout;
        } else {
            fileStream = fs.createReadStream(path);
        }
    }
    fileStream.on('error', function (err) {
        console.log('File Error', err);
    });
    const uploadParams = {Bucket: bucket, Key: key, Body: fileStream};

    return new Promise((resolve, reject)=> {
        s3.upload(uploadParams, function (err, data) {
            if (err) {
                console.log("S3 upload error: ", err);
                reject(err);
            }
            if (data) {
                fs.unlink(path, (err) => {
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
    console.log('~~~ getCurveDataFromS3: ' + bucket + "/" + key);
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

function check(){
    if(process.env.INVENTORY_S3BUCKET || config.s3Path) {
        return true;
    }
    else {
        return false;
    }
}

module.exports = {
    upload: upload,
    deleteCurve: deleteCurve,
    copyCurve: copyCurve,
    moveCurve: moveCurve,
    getData: getData,
    check: check
}
