let express = require('express');
let router = express.Router();
let async = require('async');
let path = require('path');
let fs = require('fs');
let config = require('config');
let models = require('../models');
let response = require('../response');
const s3 = require('../s3');
let exporter = require('wi-export-test');
let curveModel = require('../curve/curve.model');

function getFullWellObj (idWell) {
    return new Promise (async (resolve) => {
        try {
            let well = models.Well.findById(idWell, {include: [{model: models.WellHeader}, {model: models.Dataset}]});
            async.each(well.datasets, async (dataset, next) => {
                dataset.curves = await models.Curve.findAll({where: {idDataset: dataset.idDataset}});
                dataset.dataset_params = await models.DatasetParams.findAll({where: {idDataset: dataset.idDataset}});
                async.each(dataset.curves, async(curve, nextCurve) => {
                    curve.curve_revisions = await models.CurveRevision.findAll({where: {idCurve: curve.idCurve}});
                    nextCurve();
                }, () => {
                    next();
                })
            }, () => {
                resolve(well);
            });
        } catch (e) {
            console.log(e);
            resolve(null);
        }
    })
}

router.post('/las2', function (req, res) {

    async.map(req.body.idObjs, function (idObj, callback) {

        // models.Well.findById(idObj.idWell, {
        //     include: [{
        //         model: models.WellHeader
        //     }, {
        //         model: models.Dataset,
        //         include: [{
        //             model: models.Curve,
        //             include: {
        //                 model: models.CurveRevision
        //             }
        //         }, {
        //             model: models.DatasetParams
        //         }]
        //     }]
        // })
        getFullWellObj(idObj.idWell).then(well => {
            console.log('found well');
            if (well && well.username == req.decoded.username) {
                exporter.exportLas2FromInventory(well, idObj.datasets, config.exportPath, s3, curveModel, req.decoded.username, function (err, result) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                })
            } else {
                callback('Not found');
            }
        }).catch(err => {
            callback(err);
        })
    }, function (err, results) {
        if (err) {
            res.send(response(512, err));
        } else {
            let responseArr = [];
            async.each(results, function (rs, next) {
                async.each(rs, function (r, _next) {
                    responseArr.push(r);
                    _next();
                }, function (err) {
                    next();
                })
            }, function (err) {
                if (err) {
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
        // models.Well.findById(idObj.idWell, {
        //     include: [{
        //         model: models.WellHeader
        //     }, {
        //         model: models.Dataset,
        //         include: [{
        //             model: models.Curve,
        //             include: {
        //                 model: models.CurveRevision
        //             }
        //         }, {
        //             model: models.DatasetParams
        //         }]
        //     }]
        // })
        getFullWellObj(idObj.idWell).then(well => {
            if (well && well.username == req.decoded.username) {
                exporter.exportLas3FromInventory(well, idObj.datasets, config.exportPath, s3, curveModel, req.decoded.username, function (err, result) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                })
            } else {
                callback('Not found');
            }
        }).catch(err => {
            callback(err);
        })
    }, function (err, result) {
        if (err) {
            res.send(response(404, err));
        } else {
            res.send(response(200, 'SUCCESSFULLY', result));
        }
    });
})

router.post('/csv/rv', function (req, res) {
    async.map(req.body.idObjs, function (idObj, callback) {
        // models.Well.findById(idObj.idWell, {
        //     include: [{
        //         model: models.WellHeader
        //     }, {
        //         model: models.Dataset,
        //         include: [{
        //             model: models.Curve,
        //             include: {
        //                 model: models.CurveRevision
        //             }
        //         }, {
        //             model: models.DatasetParams
        //         }]
        //     }]
        // })
        getFullWellObj(idObj.idWell).then(well => {
            if (well && well.username == req.decoded.username) {
                exporter.exportCsvRVFromInventory(well, idObj.datasets, config.exportPath, s3, curveModel, req.decoded.username, function (err, result) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                })
            } else {
                callback('Not found');
            }
        }).catch(err => {
            callback(err);
        })
    }, function (err, results) {
        if (err) {
            res.send(response(512, err));
        } else {
            let responseArr = [];
            async.each(results, function (rs, next) {
                async.each(rs, function (r, _next) {
                    responseArr.push(r);
                    _next();
                }, function (err) {
                    next();
                })
            }, function (err) {
                if (err) {
                    res.send(response(512, err));
                } else {
                    res.send(response(200, 'SUCCESSFULLY', responseArr));
                }
            })
        }
    });
})

router.post('/csv/wdrv', function (req, res) {
    async.map(req.body.idObjs, function (idObj, callback) {
        // models.Well.findById(idObj.idWell, {
        //     include: [{
        //         model: models.WellHeader
        //     }, {
        //         model: models.Dataset,
        //         include: [{
        //             model: models.Curve,
        //             include: {
        //                 model: models.CurveRevision
        //             }
        //         }, {
        //             model: models.DatasetParams
        //         }]
        //     }]
        // })
        getFullWellObj(idObj.idWell).then(well => {
            if (well && well.username == req.decoded.username) {
                exporter.exportCsvWDRVFromInventory(well, idObj.datasets, config.exportPath, s3, curveModel, req.decoded.username, function (err, result) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                })
            } else {
                callback('Not found');
            }
        }).catch(err => {
            callback(err);
        })
    }, function (err, result) {
            if (err) {
                res.send(response(404, err));
            } else {
                res.send(response(200, 'SUCCESSFULLY', result));
            }
        });
})

router.post('/files', function (req, res) {
    let filePath = path.join(config.exportPath, req.decoded.username, req.body.fileName);
    fs.exists(filePath, function (exists) {
        if (exists) {
            // res.writeHead(200, {
            //     "Content-Type": "application/octet-stream",
            //     "Content-Disposition": "attachment; filename=" + req.body.fileName
            // });
            // fs.createReadStream(filePath).pipe(res);

            res.sendFile(path.join(__dirname, '../../', filePath));
        } else {
            res.send(response(404, "ERROR File does not exist"));
        }
    });
})

module.exports = router;
