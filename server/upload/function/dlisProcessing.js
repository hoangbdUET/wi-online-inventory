'use strict'
const dlisParser = require('dlis_parser');
const models = require('../../models');
const Op = require('sequelize').Op;
const fs = require('fs');
const config = require('config');
const hashDir = require('wi-import').hashDir;
const s3 = require('../../s3.js');
const importToDB = require('./importToDB');

function obname2Str(obj) {
    return obj.origin + "-" + obj.copy_number + "-" + obj.name;
}

function parseDlisFile(file, userInfo){
    return new Promise(function(resolve, reject){
        let well = null;
        let datasets = [];
        let channels = {};

        function onWellInfo(wellInfo) {
            if(!well) {
                well = {
                    filename: wellInfo['FILE-SET-NAME'] ? wellInfo['FILE-SET-NAME'][0] : "",
                    name: wellInfo['WELL-NAME'] ? wellInfo['WELL-NAME'][0] : wellInfo.name,
                    datasets: []
                };
            }
            // console.log("onWellInfo: " + JSON.stringify(well));
        }

        function onDatasetInfo(frame) {
            //console.log("DDD\n", frame,"\n");
            const dataset = {
                name: frame.name,
                top: frame['INDEX-MIN'] ? frame['INDEX-MIN'][0] : 0,
                bottom: frame['INDEX-MAX'] ? frame['INDEX-MAX'][0] : 0,
                step: frame['SPACING'] ? frame['SPACING'][0] : 0,
                curves: [],
                params: []
            }

            // console.log("onDatasetInfo: " + JSON.stringify(dataset));

            if(channels){
                //import curve to db
                frame['CHANNELS'].forEach(async channelName => {
                    const channel = channels[obname2Str(channelName)];
                    let curve = {
                        name: channelName.name,
                        unit: channel['UNITS'] ? channel['UNITS'][0] : "",
                        startDepth: frame['INDEX-MIN'] ? frame['INDEX-MIN'][0] : "0",
                        stopDepth: frame['INDEX-MAX'] ? frame['INDEX-MAX'][0] : "0",
                        step: frame['SPACING'] ? frame['SPACING'][0] : "0",
                        path: channel.path,
                        dimension: channel['DIMENSION'] ? channel['DIMENSION'][0] : 1,
                        description: channel['LONG-NAME'] ? channel['LONG-NAME'][0] : ""
                    }
                    dataset.curves.push(curve);
                    //console.log("==> CCC " + JSON.stringify(channel, null, 2));
                })
            } else {
                datasets.push(dataset);
            }
            well.datasets.push(dataset);
        }

        function onCurveInfo(channel){
            // console.log("CCC\n", channel,"\n");
            if(datasets.length > 0){
                //import curve to db
            }else {
                //save curve and wait for dataset
                channels[obname2Str(channel)] = channel;
            }
        }

        async function onEnd(){
            fs.unlinkSync(file.path);
            try {
                const importData = {
                    userInfo: userInfo,
                    override: true
                }
                await importToDB([well], importData);
                console.log("dlis parses file done! ==> " + file.originalname);
                resolve({
                    successFile: file.originalname,
                    successWell: well.name
                });
            } catch (err){
                console.log("==> " + err);
                reject({
                    filename: file.originalname,
                    err: err
                });
            }
        }
        userInfo.dataPath = config.dataPath;
        dlisParser.parseFile(file.path, userInfo, onWellInfo, onDatasetInfo, onCurveInfo, onEnd);
    });
};
async function parseDlisFiles (req){
    if (!req.files) return Promise.reject('NO FILE CHOSEN!!!');
    const resVal = {
        errFiles: [],
        successWells: [],
        successFiles: []
    }
    for (const file of req.files) {
        try {
            const out = await parseDlisFile(file, req.decoded);
            resVal.successFiles.push(out.successFile);
            resVal.successWells.push(out.successWell);
        } catch (e){
            resVal.errFiles.push(e);
        }
    }
    return Promise.resolve(resVal);
}
module.exports.parseDlisFiles = parseDlisFiles;
