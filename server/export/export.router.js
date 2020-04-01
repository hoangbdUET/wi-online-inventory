'use strict'
let express = require('express');
let router = express.Router();
let async = require('async');
let path = require('path');
let fs = require('fs');
let config = require('config');
let models = require('../models');
let response = require('../response');
let exporter = require('wi-export-test');
let curveModel = require('../curve/curve.model');
const dlisExport = require('dlis_export')(config);
const Op = require('sequelize').Op;
const archiver = require('archiver');

function getFilesizeInBytes(filename) {
    const stats = fs.statSync(filename);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes;
}

function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

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
    const userFolder = (process.env.INVENTORY_EXPORTPATH || config.exportPath) + '/' + req.decoded.username + '/';

    async.map(req.body.idObjs, function (idObj, callback) {
        getFullWellObj(idObj.idWell).then(well => {
            console.log('found well ');
            if (well && well.username == req.decoded.username) {
                exporter.exportLas2FromInventory(well, idObj.datasets, process.env.INVENTORY_EXPORTPATH || config.exportPath, curveModel, req.decoded.username, function (err, result) {
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
            let out = []
            for(let x of results){
                for(let item of x){
                    item.wellName = item.wellName + '_' + item.datasetName + '.las'
                    out.push(item)
                }
            }
            res.send(response(200, 'SUCCESSFULLY', out));
        }
    });
})
router.post('/las3', function (req, res) {
    const userFolder = (process.env.INVENTORY_EXPORTPATH || config.exportPath) + '/' + req.decoded.username + '/';

    async.map(req.body.idObjs, function (idObj, callback) {
        getFullWellObj(idObj.idWell).then(well => {
            if (well && well.username == req.decoded.username) {
                exporter.exportLas3FromInventory(well, idObj.datasets, process.env.INVENTORY_EXPORTPATH || config.exportPath, curveModel, req.decoded.username, function (err, result) {
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
            res.send(response(200, 'SUCCESSFULLY', result.map( x => {
                x.wellName = x.wellName + '.las'
                return x
            })));
        }
    });

})

router.post('/csv/rv', function (req, res) {
    const userFolder = (process.env.INVENTORY_EXPORTPATH || config.exportPath) + '/' + req.decoded.username + '/';
    async.map(req.body.idObjs, function (idObj, callback) {
        getFullWellObj(idObj.idWell).then(well => {
            if (well && well.username == req.decoded.username) {
                exporter.exportCsvRVFromInventory(well, idObj.datasets, process.env.INVENTORY_EXPORTPATH || config.exportPath, curveModel, req.decoded.username, function (err, result) {
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
            let out = []
            for(let x of results){
                for(let item of x){
                    item.wellName = item.wellName + '_' + item.datasetName + '.csv'
                    out.push(item)
                }
            }
            res.send(response(200, 'SUCCESSFULLY', out));
        }
    });
})

router.post('/csv/wdrv', function (req, res) {
    const userFolder = (process.env.INVENTORY_EXPORTPATH || config.exportPath) + '/' + req.decoded.username + '/';
    async.map(req.body.idObjs, function (idObj, callback) {
        getFullWellObj(idObj.idWell).then(well => {
            if (well && well.username == req.decoded.username) {
                exporter.exportCsvWDRVFromInventory(well, idObj.datasets, process.env.INVENTORY_EXPORTPATH || config.exportPath, curveModel, req.decoded.username, function (err, result) {
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
            res.send(response(200, 'SUCCESSFULLY', result.map(x => {
                x.wellName = x.wellName + '.csv'
                return x
            })));
        }
    });
})

router.post('/files', function (req, res) {
    if(req.body.files && req.body.files.length == 1){
        let filePath = path.join(
            process.env.INVENTORY_EXPORTPATH || config.exportPath,
            req.decoded.username,
            req.body.files[0]
        );
        // console.log(filePath)
        fs.exists(filePath, async function (exists) {
            if (exists) {
                const currentSize = getFilesizeInBytes(filePath);
                // console.log('Current size : ', currentSize);
                await sleep(4000);
                const newSize = getFilesizeInBytes(filePath);
                // console.log('New size : ', newSize);
                if (currentSize !== newSize) {
                    res.send(
                        ResponseJSON(
                            512,
                            'Your file is currently processing',
                            'Your file is currently processing'
                        )
                    );
                } else {
                    res.contentType('application/octet-stream');
                    res.sendFile(filePath);
                }
            } else {
                res.send(ResponseJSON(404, 'ERROR File does not exist'));
            }
        });
    }
    else {
        const archive = archiver('zip');
        archive.on('error', function(err) {
            res.send(ResponseJSON(500, "Zipping err", err));
        });
        //res.attachment('I2G_export.zip');
        res.contentType('application/octet-stream');
        archive.pipe(res);
        for (const filename of req.body.files){
            const filepath = path.join(
                process.env.INVENTORY_EXPORTPATH || config.exportPath,
                req.decoded.username,
                filename);
            archive.file(filepath, {name: filename})
        }
        archive.finalize();
    }
})

router.post('/dlisv1', async function (req, res) {
    try {
        const results = [];
        const wells = [];
        let fileName = Date.now();
        let wellName = '';
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
                        }
                    }
                }
            }
            wells.push(well);
            fileName += '_' + well.name.replace(/\//g, "_");
            if(wellName.length <= 0){
                wellName = well.name;
            }else {
                wellName += '_' + well.name;
            }
        }
        const exportDir = (process.env.INVENTORY_EXPORTPATH || config.exportPath) + '/' + req.decoded.username;
        fileName += '.dlis';
        if(!fs.existsSync(exportDir)){
            fs.mkdirSync(exportDir, {recursive: true});
        }
        await dlisExport.export(wells, exportDir + '/' + fileName, curveModel.getCurveData);
        results.push({
            fileName: fileName,
            wellName: wellName + '.dlis'
        })

        res.send(response(200, 'SUCCESSFULLY', results));
    }
    catch (err){
        console.log(err)
        res.send(response(404, err));
    }
})
router.post('/dlisv1obj', async function (req, res) {
    try {
        const results = [];
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
            results.push({
                well: well
            })
        }

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
