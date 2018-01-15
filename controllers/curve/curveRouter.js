"use strict";
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let models = require('../../models/index');
let Curve = models.Curve;
let curveExport = require('./curveExport');
let response = require('../response');
let curveModel= require('./curve.model');

router.use(bodyParser.json());

router.post('/curve/new', function (req, res) {
    curveModel.createCurve(req.body, (err, curve) => {
        if(err) res.send(response(500, 'FAILED TO CREATE NEW CURVE', err));
        else res.send(response(200, 'SUCCESSFULLY CREATE NEW CURVE', curve));
    })
});

router.post('/curve/info', function (req, res) {
    curveModel.findCurveById(req.body.idCurve, req.decoded.username)
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
    curveModel.findCurveById(req.body.idCurve, req.decoded.username)
        .then((curve) => {
            if (curve) {
                curveExport(curve, req.body.unit, (err, readStream) => {
                    if(!err){
                        readStream.pipe(res);
                    }
                    else {
                        res.send(response(500, 'CURVE CONVERSION FAILED', err));
                    }
                });
            } else {
                res.send(response(200, 'NO CURVE FOUND BY ID'));
            }
        })
        .catch((err) => {
            res.send(response(500, 'FAILED TO FIND CURVE', err));
        })
})

router.post('/curve/edit', function (req, res) {

    curveModel.editCurve(req.body, req.decoded.username, (err, result) => {
        if(err){
            console.log(err);
            res.send(response(500, 'FAILED TO EDIT CURVE', err));
        }
        else {
            res.send(response(200, 'SUCCESSFULLY EDIT CURVE', result));
        }
    })

});
router.post('/curve/delete', function (req, res) {
    curveModel.findCurveById(req.body.idCurve, req.decoded.username)
        .then(curve => {
            if (curve) {
                curveModel.deleteCurve(curve, (err, rs)=>{
                    if(err) {
                        console.log(err);
                        res.send(response(500, 'FAILED TO DELETE CURVE', err));
                    }
                    else res.send(response(200, 'SUCCESSFULLY DELETE CURVE', rs));
                })
            } else {
                res.send(response(500, 'NO CURVE FOUND FOR DELETE'));
            }
        }).catch(err => {
            console.log(err);
            res.send(response(500, 'FAILED TO FIND CURVE', err));
    });
});

router.post('/curves', function (req, res) {
    curveModel.getCurves(req.body.idDataset, req.decoded.username)
        .then((curves) => {
            res.send(response(200, 'SUCCESSFULLY GET CURVES', curves));
        })
        .catch((err) => {
            res.send(response(500, 'FAILED TO FIND CURVES', err));
        })
})


module.exports = router;
