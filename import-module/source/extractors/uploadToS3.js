'use strict'

let AWS = require('aws-sdk');
let config = require('config');
var fs = require('fs');

module.exports = (curve) => {
    var credentials = new AWS.SharedIniFileCredentials({profile: 'wi_inventory'});
    AWS.config.credentials = credentials;
    let s3 = new AWS.S3({apiVersion: '2006-03-01'});

    let fileSystemPath = config.dataPath + '/' + curve.path;

    var uploadParams = {Bucket: 'wi-inventory', Key: '', Body: ''};

    var fileStream = fs.createReadStream(fileSystemPath);
    fileStream.on('error', function (err) {
        console.log('File Error', err);
    });
    uploadParams.Body = fileStream;
    uploadParams.Key = curve.path;

    s3.upload(uploadParams, function (err, data) {
        if (err) {
            console.log("Error", err);
        }
        if (data) {
            console.log("Upload Success", data.Location);
            fs.unlink(fileSystemPath, (err) => {
                if(err) console.log("failed to remove curve: " + err);
            })
        }
    });
}
