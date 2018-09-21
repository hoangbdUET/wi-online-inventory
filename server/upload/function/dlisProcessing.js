'use strict'
const dlisParser = require('dlis_parser');
const models = require('../../models');
const Op = require('sequelize').Op;
const fs = require('fs');
const config = require('config');
const hashDir = require('wi-import').hashDir;
const s3 = require('../../s3.js');

function obname2Str(obj) {
    return obj.origin + "-" + obj.copy_number + "-" + obj.name;
}

function parseDlisFile(file, userInfo){
    let well = {};
    let datasets = [];
    let channels = {};
    let BUFFERS = {};

    async function onWellInfo(wellInfo) {
        try{
            const wellData = {
                name: wellInfo['WELL-NAME'][0],
                username: wellInfo.userInfo.username,
                filename: wellInfo['FILE-SET-NAME'][0]
            };
            well = (await models.Well.findOrCreate({
                where: {
                    [Op.and]: [
                        {name: {[Op.eq]: wellData.name}},
                        {username: wellData.username},
                    ]
                },
                defaults: wellData,
                include: {
                    model: models.WellHeader
                }
            }))[0];
            console.log(JSON.stringify(well));
        } catch (err){
            console.log(err);
        }
    }

    async function onDatasetInfo(frame) {
        //console.log("DDD\n", frame,"\n");
        try{
            const datasetData = {
                idWell: well.idWell,
                name: obname2Str(frame),
                step: frame['SPACING'][0]
            }
            const dataset = (await models.Dataset.findOrCreate({
                where: {
                    [Op.and]: [
                        {name: {[Op.eq]: datasetData.name}},
                        {idWell: well.idWell}
                    ]
                },
                defaults: datasetData,
            }))[0];
            if(channels){
                //import curve to db
                frame['CHANNELS'].forEach(async channelName => {
                    const channel = channels[obname2Str(channelName)];
                    let curveData = {
                        idDataset: dataset.idDataset,
                        name: obname2Str(channelName),
                        description: channel['LONG-NAME'][0]
                    }
                    let revisionData = {
                        idCurve: 0,
                        unit: channel['UNITS'] ? channel['UNITS'][0] : "",
                        startDepth: frame['INDEX-MIN'] ? frame['INDEX-MIN'][0] : "0",
                        stopDepth: frame['INDEX-MAX'] ? frame['INDEX-MAX'][0] : "0",
                        step: frame['SPACING'] ? frame['SPACING'][0] : "0",
                        isCurrentRevision: true
                    }
                    //console.log("==> CCC " + JSON.stringify(channel, null, 2));
                    const curve = (await models.Curve.findOrCreate({
                        where: {
                            [Op.and]: [
                                {name: {[Op.eq]: curveData.name}},
                                {idDataset: dataset.idDataset}
                            ]
                        },
                        defaults: curveData,
                        //logging: console.log
                    }))[0];

                    //create curve revision
                    revisionData.idCurve = curve.idCurve;
                    
                    await models.CurveRevision.create(revisionData);
                    //get key
                    const hashStr = userInfo.username + well.name + dataset.name + curveData.name + revisionData.unit + revisionData.step;
                    BUFFERS[curveData.name].path = hashDir.createPath(config.dataPath, hashStr, curveData.name + '.txt');
                    console.log("==> "+ BUFFERS[curveData.name].path);

                    console.log(JSON.stringify(curve));
                })  
            } else {
                datasets.push(dataset);
            }
            console.log(JSON.stringify(dataset));
        } catch (err){
            console.log(err);
        }
    }

    function onCurveInfo(channel){
        //console.log("CCC\n", curveInfo,"\n");
        if(datasets.length > 0){
            //import curve to db
        }else {
            //save curve and wait for dataset
            channels[obname2Str(channel)] = channel;
            BUFFERS[obname2Str(channel)] = {
                count: 0,
                data:"" 
            };
        }
    }

    function onCurveData(fdatas) {
        //console.log(curveData);
        for(const fdata of fdatas){
            BUFFERS[fdata.name].count++;
            BUFFERS[fdata.name].data += BUFFERS[fdata.name].count + " " + fdata.data[0] + "\n";
            if(BUFFERS[fdata.name].count % 1000 == 0){
                console.log("write: " + fdata.name)
                fs.appendFileSync(BUFFERS[fdata.name].path, BUFFERS[fdata.name].data);
                BUFFERS[fdata.name].data = "";
            }
        }
    }

    function onEnd(){
        let key = "";
        for(const curveName in BUFFERS){
            const buffer = BUFFERS[curveName];
            if(buffer.path){
                fs.appendFileSync(buffer.path, buffer.data);
                if(config.s3Path){
                    key = buffer.path.replace(config.dataPath + '/', "");
                    s3.upload(buffe.path, key); 
                }
            }
        }
    }
    console.log(JSON.stringify(file, null, 2));
    dlisParser.parseFile(file.path, userInfo, onWellInfo, onDatasetInfo, onCurveInfo, onCurveData, onEnd);
};
async function parseDlisFiles (req){
    if (!req.files) return Promise.reject('NO FILE CHOSEN!!!');
    for (const file of req.files) {
        parseDlisFile(file, req.decoded);
    }
    return Promise.resolve("done");
}
module.exports.parseDlisFiles = parseDlisFiles;
