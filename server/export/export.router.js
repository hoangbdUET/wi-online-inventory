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
    let wellnames = '';
    const userFolder = (process.env.INVENTORY_EXPORTPATH || config.exportPath) + '/' + req.decoded.username + '/';
    const zipFile = Date.now() + '_I2GExport.zip';
    const output = fs.createWriteStream(userFolder + zipFile);
    const archive = archiver('zip', {
        zlib: {level: 9} // Sets the compression level.
    });
    archive.pipe(output);

    async.map(req.body.idObjs, function (idObj, callback) {
        getFullWellObj(idObj.idWell).then(well => {
            console.log('found well ');
            if (well && well.username == req.decoded.username) {
                exporter.exportLas2FromInventory(well, idObj.datasets, process.env.INVENTORY_EXPORTPATH || config.exportPath, curveModel, req.decoded.username, function (err, result) {
                    if (err) {
                        callback(err, null);
                    } else {
                        if(wellnames.length <= 0)
                            wellnames = result[0].wellName;
                        else
                            wellnames += "_" + result[0].wellName;
                        for(const file of result) {
                            archive.file(userFolder + file.fileName, {name: file.wellName + '_' + file.datasetName + '.las'});
                        }
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
            archive.finalize();
            res.send(response(200, 'SUCCESSFULLY', [{fileName: zipFile, wellName: wellnames + '.zip'}]));
        }
    });
})
router.post('/las3', function (req, res) {
    let wellnames = '';
    const userFolder = (process.env.INVENTORY_EXPORTPATH || config.exportPath) + '/' + req.decoded.username + '/';
    const zipFile = Date.now() + '_I2GExport.zip';
    const output = fs.createWriteStream(userFolder + zipFile);
    const archive = archiver('zip', {
        zlib: {level: 9} // Sets the compression level.
    });
    archive.pipe(output);

    async.map(req.body.idObjs, function (idObj, callback) {
        getFullWellObj(idObj.idWell).then(well => {
            if (well && well.username == req.decoded.username) {
                exporter.exportLas3FromInventory(well, idObj.datasets, process.env.INVENTORY_EXPORTPATH || config.exportPath, curveModel, req.decoded.username, function (err, result) {
                    if (err) {
                        callback(err, null);
                    } else {
                        if(wellnames.length <= 0)
                            wellnames = result.wellName;
                        else
                            wellnames += "_" + result.wellName;
                        archive.file(userFolder + result.fileName, {name: result.wellName + '.las'});
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
            archive.finalize();
            res.send(response(200, 'SUCCESSFULLY', [{fileName: zipFile, wellName: wellnames + '.zip'}]));
        }
    });

})

router.post('/csv/rv', function (req, res) {
    let wellnames = '';
    const userFolder = (process.env.INVENTORY_EXPORTPATH || config.exportPath) + '/' + req.decoded.username + '/';
    const zipFile = Date.now() + '_I2GExport.zip';
    const output = fs.createWriteStream(userFolder + zipFile);
    const archive = archiver('zip', {
        zlib: {level: 9} // Sets the compression level.
    });
    archive.pipe(output);
    async.map(req.body.idObjs, function (idObj, callback) {
        getFullWellObj(idObj.idWell).then(well => {
            if (well && well.username == req.decoded.username) {
                exporter.exportCsvRVFromInventory(well, idObj.datasets, process.env.INVENTORY_EXPORTPATH || config.exportPath, curveModel, req.decoded.username, function (err, result) {
                    if (err) {
                        callback(err, null);
                    } else {
                        if(wellnames.length <= 0)
                            wellnames = result[0].wellName;
                        else
                            wellnames += "_" + result[0].wellName;
                        for(const file of result) {
                            archive.file(userFolder + file.fileName, {name: file.wellName + '_' + file.datasetName + '.csv'});
                        }
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
            archive.finalize();
            res.send(response(200, 'SUCCESSFULLY', [{fileName: zipFile, wellName: wellnames + '.zip'}]));
        }
    });
})

router.post('/csv/wdrv', function (req, res) {
    let wellnames = '';
    const userFolder = (process.env.INVENTORY_EXPORTPATH || config.exportPath) + '/' + req.decoded.username + '/';
    const zipFile = Date.now() + '_I2GExport.zip';
    const output = fs.createWriteStream(userFolder + zipFile);
    const archive = archiver('zip', {
        zlib: {level: 9} // Sets the compression level.
    });
    archive.pipe(output);
    async.map(req.body.idObjs, function (idObj, callback) {
        getFullWellObj(idObj.idWell).then(well => {
            if (well && well.username == req.decoded.username) {
                exporter.exportCsvWDRVFromInventory(well, idObj.datasets, process.env.INVENTORY_EXPORTPATH || config.exportPath, curveModel, req.decoded.username, function (err, result) {
                    if (err) {
                        callback(err, null);
                    } else {
                        if(wellnames.length <= 0)
                            wellnames = result.wellName;
                        else
                            wellnames += "_" + result.wellName;
                        archive.file(userFolder + result.fileName, {name: result.wellName + '.csv'});
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
            archive.finalize();
            res.send(response(200, 'SUCCESSFULLY', [{fileName: zipFile, wellName: wellnames + '.zip'}]));
        }
    });
})

router.post('/files', function (req, res) {
    const filePath = path.join(process.env.INVENTORY_EXPORTPATH || config.exportPath, req.decoded.username, req.body.fileName);
    fs.exists(filePath, function (exists) {
        if (exists) {
            // res.writeHead(200, {
            //     "Content-Type": "application/octet-stream",
            //     "Content-Disposition": "attachment; filename=" + req.body.fileName
            // });
            // fs.createReadStream(filePath).pipe(res);
            res.contentType('application/octet-stream')
            res.download(filePath);
        } else {
            res.send(response(404, "ERROR File does not exist"));
        }
    });
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
            fileName += '_' + well.name;
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
