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
    const convertTransform = new Transform({
        writableObjectMode: true,
        transform(chunk, encoding, callback) {
            let tokens = chunk.toString().split(/\s+/);
            if(step == 0) {
                this.push(tokens[0] * rate + " " + tokens[1] + "\n");
            }else {
                this.push(index + " " + tokens[1] + "\n");
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
                datasetModel.findById(curve.idDataset).then(dataset => {
                    step = dataset.step;
                    if (parseFloat(dataset.step) === 0) rate = convert.getDistanceRate(dataset.unit, "meter");
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
