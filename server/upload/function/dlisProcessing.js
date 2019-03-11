'use strict'
const dlisParser = require('dlis_parser');
const models = require('../../models');
const Op = require('sequelize').Op;
const fs = require('fs');
const config = require('config');
const hashDir = require('wi-import').hashDir;
const s3 = require('../../s3.js');
const importToDB = require('./importToDB');

const mqtt = require("mqtt");
const client = mqtt.connect("ws://mqtt-broker.i2g.cloud:8888");

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
            let _direction = 'INCREASING';
            if(frame['SPACING']){
                if(frame['SPACING'][0] < 0) _direction = 'DECREASING';
            } else if(frame['DIRECTION']){
                _direction = frame['DIRECTION'][0];
            }
            let _step = frame['SPACING'] ? frame['SPACING'][0] : 0;
            let _top = frame['INDEX-MIN'] ? frame['INDEX-MIN'][0] : 0;
            let _bottom = frame['INDEX-MAX'] ? frame['INDEX-MAX'][0] : 0;
            if(_direction == 'DECREASING'){
                _step = -_step;
                const tmp = _top;
                _top = _bottom;
                _bottom = tmp;
            }

            const dataset = {
                _id: obname2Str(frame),
                name: frame.name,
                top: _top,
                bottom: _bottom,
                step: _step,
                direction: _direction,
                curves: [],
                params: []
            }

            // console.log("onDatasetInfo: " + JSON.stringify(dataset));

            if(channels){
                //import curve to db
                frame['CHANNELS'].forEach(async channelName => {
                    const channel = channels[obname2Str(channelName)];
                    let _dimension = 1;
                    let _type = 'NUMBER';
                    if(channel['DIMENSION']){
                        for(const x of channel['DIMENSION']){
                            _dimension *= x;
                        }
                    }
                    if(_dimension > 1){
                        _type = 'ARRAY';
                    }
                    let curve = {
                        name: channelName.name,
                        unit: channel['UNITS'] ? channel['UNITS'][0] : "",
                        startDepth: dataset.top,
                        stopDepth: dataset.bottom,
                        step: dataset.step,
                        path: channel.path,
                        dimension: _dimension,
                        description: channel['LONG-NAME'] ? channel['LONG-NAME'][0] : "",
                        type: _type
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

        async function onEnd(data){
            fs.unlink(file.path, () => {});
            try {
                const importData = {
                    userInfo: userInfo,
                    override: true
                }
                // update dataset top/bottom
                for (const dataset of well.datasets){
                    for(const frame of data.frames){
                        if(dataset._id == obname2Str(frame)){
                            dataset.top = frame.index_min;
                            dataset.bottom = frame.index_max;
                        }
                    }
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
    for (const file of req.files) {
        try {
            const out = await parseDlisFile(file, req.decoded);
            const opts = {
                qos: 2, // 0, 1, or 2
            };
            const _content = JSON.stringify({
                status: "OK",
                file: out.successFile
            })
            client.publish("dlis/" + req.decoded.username, _content, opts);
        } catch (e){
            const opts = {
                qos: 2, // 0, 1, or 2
            };
            const _content = JSON.stringify({
                status: "ERR",
                file: out.filename
            })
            client.publish("dlis/" + req.decoded.username, _content, opts);
        }
    }
}

// async function parseDlisFiles (req){
//     if (!req.files) return Promise.reject('NO FILE CHOSEN!!!');
//     const resVal = {
//         errFiles: [],
//         successWells: [],
//         successFiles: []
//     }
//     for (const file of req.files) {
//         try {
//             const out = await parseDlisFile(file, req.decoded);
//             resVal.successFiles.push(out.successFile);
//             resVal.successWells.push(out.successWell);
//         } catch (e){
//             resVal.errFiles.push(e);
//         }
//     }
//     return Promise.resolve(resVal);
// }

module.exports.parseDlisFiles = parseDlisFiles;
