let express = require('express');
let router = express.Router();
let async = require('async');
let path = require('path');
let config = require('config');
let models = require('../server/models');
let response = require('../server/response');
const s3 = require('../server/s3');
let exporter = require('wi-export-test');
let curveModel = require('../server/curve/curve.model');

router.post('/las2', function (req, res) {
    async.map(req.body.idObjs, function (idObj, callback) {
        models.Well.findById(idObj.idWell,{
            include: [{
                model: models.WellHeader
            }, {
                model: models.Dataset,
                include: [{
                    model: models.Curve,
                    include: {
                        model: models.CurveRevision
                    }
                }, {
                    model: models.DatasetParams
                }]
            }]
        }).then(well =>{
            if(well && well.username == req.decoded.username){
                exporter.exportLas2FromInventory(well, idObj.datasets, config.exportPath, s3, curveModel, req.decoded.username, function(err, result){
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                })
            }
        })
    }, function (err, results) {     
        if (err) {
            res.send(response(512, err));
        } else {
            let responseArr = [];
            async.each(results, function(rs, next) {
                async.each(rs, function(r, _next) {
                    r.path = path.join(config.exportUrl, req.decoded.username, r.fileName);
                    responseArr.push(r);
                    _next();
                }, function(err){
                    next();
                })
            }, function(err){
                if(err) {
                    res.send(response(512, err));                    
                } else {
                    res.send(response(200, 'SUCCESSFULLY', responseArr));
                }
            })
        }
    });
})
router.post('/las3', function (req, res) {
    async.map(req.body.idObjs, function (idObj, callback) {
        models.Well.findById(idObj.idWell,{
            include: [{
                model: models.WellHeader
            }, {
                model: models.Dataset,
                include: [{
                    model: models.Curve,
                    include: {
                        model: models.CurveRevision
                    }
                }, {
                    model: models.DatasetParams
                }]
            }]
        }).then(well =>{
            if(well && well.username == req.decoded.username){
                exporter.exportLas3FromInventory(well, idObj.datasets, config.exportPath, s3, curveModel, req.decoded.username, function(err, result){
                    if (err) {
                        callback(err, null);
                    } else {
                        result.path = path.join(config.exportUrl, req.decoded.username, result.fileName);
                        callback(null, result);
                    }
                })
            }
        })
    }, function (err, result) {
        if (err) {
            res.send(response(404, err));
        } else {
            res.send(response(200, 'SUCCESSFULLY', result));
        }
    });
})

router.post('/csv', function (req, res) {
    async.map(req.body.idObjs, function (idObj, callback) {
        models.Well.findById(idObj.idWell,{
            include: [{
                model: models.WellHeader
            }, {
                model: models.Dataset,
                include: [{
                    model: models.Curve,
                    include: {
                        model: models.CurveRevision
                    }
                }, {
                    model: models.DatasetParams
                }]
            }]
        }).then(well =>{
            if(well && well.username == req.decoded.username){
                exporter.exportCsvFromInventory(well, idObj.datasets, config.exportPath, s3, curveModel, req.decoded.username, function(err, result){
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                })
            }
        })
    }, function (err, results) {     
        if (err) {
            res.send(response(512, err));
        } else {
            let responseArr = [];
            async.each(results, function(rs, next) {
                async.each(rs, function(r, _next) {
                    r.path = path.join(config.exportUrl, req.decoded.username, r.fileName);
                    responseArr.push(r);
                    _next();
                }, function(err){
                    next();
                })
            }, function(err){
                if(err) {
                    res.send(response(512, err));                    
                } else {
                    res.send(response(200, 'SUCCESSFULLY', responseArr));
                }
            })
        }
    });
})

module.exports = router;