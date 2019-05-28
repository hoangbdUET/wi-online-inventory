"use strict";
let express = require('express');
let router = express.Router();
let curveExport = require('./curveExport');
let response = require('../response');
let curveModel = require('./curve.model');
let datasetModel = require('../models').Dataset;

router.post('/curve/new', function (req, res) {
    curveModel.createCurve(req.body, (err, curve) => {
        if (err) res.send(response(500, 'FAILED TO CREATE NEW CURVE', err));
        else res.send(response(200, 'SUCCESSFULLY CREATE NEW CURVE', curve));
    });
});

router.post('/curve/info', function (req, res) {
    const attributes = {
        revision: true
    };
    curveModel.findCurveById(req.body.idCurve, req.decoded.username, attributes)
        .then(curve => {
            if (curve) {
                res.send(response(200, 'SUCCESSFULLY GET CURVE INFOR', curve));
            } else {
                res.send(response(200, 'NO CURVE FOUND BY ID'));
            }
        }).catch(err => {
        res.send(response(500, 'FAILED TO FIND CURVE', err));
    });
});

router.post('/curve/data', function (req, res) {
    const {Transform} = require('stream');
    const byline = require('byline');
    const convert = require('../utils/convert');
    let rate = 1;
    let index = 0;
    let step = 0;
    let _delimiter = ' ';
    let _dimension = 1;
    let curveType = "NUMBER";

    function customSplit(str, delimiter){
        let words;
        if(str.includes('"')){
            str = str.replace(/"[^"]+"/g, function (match, idx, string){
                let tmp = match.replace(/"/g, '');
                return '"' + Buffer.from(tmp).toString('base64') + '"';
            })
            words = str.split(delimiter);
            words = words.map(function(word){
                if(word.includes('"')){
                    return '"' + Buffer.from(word.replace(/"/g, ''), 'base64').toString() + '"';
                }
                else return word;
            })
        }else {
            words = str.split(delimiter);
        }
        return words;
    }
    const convertTransform = new Transform({
        writableObjectMode: true,
        transform(chunk, encoding, callback) {
            const _str = chunk.toString();
            const arr = customSplit(_str, _delimiter);
            if(curveType == "TEXT"){
                for(let i = 1; i < arr.length; i++){
                    if(arr[i] == "null"){
                        arr[i] = '""';
                    }
                }
            }
            if(step == 0) {
                this.push(parseFloat(arr.shift()) * rate + " " + arr.join(_delimiter) + "\n");
            }else {
                arr.shift();
                this.push(index + " " + arr.join(_delimiter) + "\n");
                index++;
            }
            callback();
        }
    });
    const attributes = {
        revision: true
    };
    curveModel.findCurveById(req.body.idCurve, req.decoded.username, attributes)
        .then((curve) => {
            if (curve) {
                datasetModel.findByPk(curve.idDataset).then(dataset => {
                    curveType = curve.type;
                    step = dataset.step;
                    _delimiter = curve.delimiter;
                    _dimension = curve.dimension;
                    if (parseFloat(dataset.step) === 0) rate = convert.getDistanceRate(dataset.unit, "meter") || 1;
                    curveExport(curve, req.body.unit, req.body.step, (err, readStream) => {
                        if (!err) {
                            byline.createStream(readStream).pipe(convertTransform).pipe(res);
                        }
                        else {
                            console.log(err);
                            res.send(response(500, 'CURVE CONVERSION FAILED', err));
                        }
                    });
                });
            } else {
                res.send(response(200, 'NO CURVE FOUND BY ID'));
            }
        })
        .catch((err) => {
            res.send(response(500, 'FAILED TO FIND CURVE', err));
        });
});

router.post('/curve/rawdata', function (req, res) {
    const attributes = {
        revision: true
    };
    curveModel.findCurveById(req.body.idCurve, req.decoded.username, attributes)
        .then((curve) => {
            if (curve) {
                curveExport(curve, req.body.unit, req.body.step, (err, readStream) => {
                    if (!err) {
                        readStream.pipe(res);
                    }
                    else {
                        console.log(err);
                        res.send(response(500, 'CURVE CONVERSION FAILED', err));
                    }
                });
            } else {
                res.send(response(200, 'NO CURVE FOUND BY ID'));
            }
        })
        .catch((err) => {
            res.send(response(500, 'FAILED TO FIND CURVE', err));
        });
});

router.post('/curve/edit', function (req, res) {
    curveModel.editCurve(req.body, req.decoded.username, (err, result) => {
        if (err) {
            console.log(err);
            res.send(response(500, 'FAILED TO EDIT CURVE', err));
        }
        else {
            res.send(response(200, 'SUCCESSFULLY EDIT CURVE', result));
        }
    });
});

router.post('/curve/delete', function (req, res) {
    curveModel.deleteCurve(req.body.idCurve, req.decoded.username)
        .then(result => {
            res.send(response(200, 'SUCCESSFULLY DELETE CURVE', result));
        })
        .catch(err => {
            res.send(response(500, 'FAILED TO DELETE CURVE', err));
        });
});

router.post('/curves', function (req, res) {
    curveModel.getCurves(req.body.idDataset, req.decoded.username, (err, result) => {
        if (err) res.send(response(500, 'FAILED TO FIND CURVES', err));
        else res.send(response(200, 'SUCCESSFULLY GET CURVES', result));
    });
});

router.post('/curve/find-well', function (req, res) {
    curveModel.findWellByCurveName(req.body.names, function (err, result) {
        if (err) res.send(response(500, err, err));
        else res.send(response(200, "Successfull list well", result));
    }, req.decoded.username);
});

module.exports = router;
