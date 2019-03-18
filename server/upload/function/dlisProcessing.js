'use strict'
const dlisParser = require('dlis_parser');
const models = require('../../models');
const Op = require('sequelize').Op;
const fs = require('fs');
const config = require('config');
const hashDir = require('wi-import').hashDir;
const s3 = require('../../s3.js');
const importToDB = require('./importToDB');
const del = require('del');

const mqtt = require("mqtt");
const client = mqtt.connect("ws://mqtt-broker.i2g.cloud:8888");

function parseDlisFile(file, userInfo){
    return new Promise(function(resolve, reject){
        async function onEnd(wells){
            fs.unlink(file.path, () => {});
            try {
                const importData = {
                    userInfo: userInfo,
                    override: true
                }

                const importResult = await importToDB(wells, importData);
                del(wells[0].dataDir);
                console.log("dlis parses file done! ==> " + file.originalname);
                resolve({
                    successFile: file.originalname,
                    successWell: importResult
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
        dlisParser.parseFile(file.path, userInfo, onEnd);
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

module.exports.parseDlisFiles = parseDlisFiles;
