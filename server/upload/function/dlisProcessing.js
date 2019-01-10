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
        let well = {
            filename: "",
            name: "",
            datasets: []
        };
        let datasets = [];
        let channels = {};

        function onWellInfo(wellInfo) {
            well.filename = wellInfo['FILE-SET-NAME'] ? wellInfo['FILE-SET-NAME'][0] : "";
            well.name = wellInfo['WELL-NAME'] ? wellInfo['WELL-NAME'][0] : "";
            // console.log("onWellInfo: " + JSON.stringify(well));
        }

        function onDatasetInfo(frame) {
            //console.log("DDD\n", frame,"\n");
            const dataset = {
                name: obname2Str(frame),
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
                        name: obname2Str(channelName),
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
            try {
                const importData = {
                    userInfo: userInfo,
                    override: true
                }
                await importToDB([well], importData);
                console.log("dlis parses file done!");
                resolve();
            } catch (err){
                console.log("==> " + err);
                reject();
            }
        }
        userInfo.dataPath = config.dataPath;
        dlisParser.parseFile(file.path, userInfo, onWellInfo, onDatasetInfo, onCurveInfo, onEnd);
    });
};
async function parseDlisFiles (req){
    if (!req.files) return Promise.reject('NO FILE CHOSEN!!!');
    let output = [];
    for (const file of req.files) {
        output.push(parseDlisFile(file, req.decoded));
    }
    return Promise.all(output);
}
module.exports.parseDlisFiles = parseDlisFiles;
