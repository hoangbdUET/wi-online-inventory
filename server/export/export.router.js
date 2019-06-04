'use strict'
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
const dlisExport = require('dlis_export')(config);
const Op = require('sequelize').Op;

async function getFullWellObj(idWell){
    try {
        const well = await models.Well.findByPk(idWell, {
            include: [{
                model: models.WellHeader
            }, {
                model: models.Dataset,
                include: [{
                    model: models.Curve,
                    include: [{
                        model: models.CurveRevision
                    }]
                }, {
                    model: models.DatasetParams
                }]
            }]
        })
        return Promise.resolve(well);
    } catch (err) {
        console.log("fail to get well: " + err);
        return Promise.reject()
    }
}

router.post('/las2', function (req, res) {

    async.map(req.body.idObjs, function (idObj, callback) {
        getFullWellObj(idObj.idWell).then(well => {
            console.log('found well ');
            if (well && well.username == req.decoded.username) {
                exporter.exportLas2FromInventory(well, idObj.datasets, process.env.INVENTORY_EXPORTPATH || config.exportPath, s3, curveModel, req.decoded.username, function (err, result) {
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
        // models.Well.findByPk(idObj.idWell, {
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
                exporter.exportLas3FromInventory(well, idObj.datasets, process.env.INVENTORY_EXPORTPATH || config.exportPath, s3, curveModel, req.decoded.username, function (err, result) {
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
        // models.Well.findByPk(idObj.idWell, {
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
                exporter.exportCsvRVFromInventory(well, idObj.datasets, process.env.INVENTORY_EXPORTPATH || config.exportPath, s3, curveModel, req.decoded.username, function (err, result) {
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
        // models.Well.findByPk(idObj.idWell, {
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
                exporter.exportCsvWDRVFromInventory(well, idObj.datasets, process.env.INVENTORY_EXPORTPATH || config.exportPath, s3, curveModel, req.decoded.username, function (err, result) {
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
    let filePath = path.join(process.env.INVENTORY_EXPORTPATH || config.exportPath, req.decoded.username, req.body.fileName);
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

router.post('/dlisv1', async function (req, res) {
    try {
        const results = [];
        const wells = [];
        for (const obj of req.body.idObjs){
            const datasetIDs = [];
            let curveIDs = [];

            for(const dataset of obj.datasets){
                datasetIDs.push(dataset.idDataset)
                curveIDs = curveIDs.concat(dataset.idCurves)
            }

            let well = await models.Well.findByPk(obj.idWell, {
                include: [{
                    model: models.WellHeader
                },{
                    model: models.Dataset,
                    where: {
                        idDataset: {
                            [Op.in]: datasetIDs
                        }
                    },
                    include: [{
                        model: models.Curve,
                        where: {
                            idCurve: {
                                [Op.in]: curveIDs
                            }
                        },
                        include: [{
                            model: models.CurveRevision
                        }]
                    }
                    ]
                }]
            })
            well = well.toJSON();
            for(const dataset of well.datasets){
                for(const curve of dataset.curves){
                    for(const revision of curve.curve_revisions){
                        if(revision.isCurrentRevision){
                            curve.unit = revision.unit;
                            curve.key = await curveModel.getCurveKey(revision);
                            break;
                        }
                    }
                    delete curve.curve_revisions;
                }
            }
            wells.push(well);
        }
        const exportDir = config.exportPath + '/' + req.decoded.username;
        const fileName = Date.now() + well.name + '.dlis';
        if(!fs.existsSync(exportDir)){
            fs.mkdirSync(exportDir, {recursive: true});
        }
        await dlisExport.export(wells, exportDir + '/' + fileName);
        results.push({
            fileName: fileName,
            wellName: well.name
        })

        res.send(response(200, 'SUCCESSFULLY', results));
    }
    catch (err){
        console.log(err)
        res.send(response(404, err));
    }
})

router.post('/clear', function (req, res) {
    try{
        const dir = config.exportPath + '/' + req.decoded.username;
        fs.readdir(dir, (err, files) => {
            if (err) throw err;

            for (const file of files) {
                fs.unlink(path.join(dir, file), err => {
                    if (err) throw err;
                });
            }
        });
    } catch (err){
        console.log(err);
    }
    res.send(response(200, 'SUCCESSFULLY'));
})

module.exports = router;
