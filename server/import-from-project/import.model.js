let asyncEach = require('async/each');
let asyncQueue = require('async/queue');
let async = require('async');
let fs = require('fs');
let path = require('path');
let curveModel = require('../curve/curve.model');
let datasetModel = require('../dataset/dataset.model');
let wellModel = require('../well/well.model');
let request = require('request');
let models = require('../models');
const hashDir = require('wi-import').hashDir;
let config = require('config');
let s3 = require('../s3');

class Options {
    constructor(path, token, payload) {
        this.method = 'POST';
        this.url = 'http://' + config.Service.project + path;
        this.headers = {
            'Cache-Control': 'no-cache',
            Authorization: token,
            'Content-Type': 'application/json'
        };
        this.body = payload;
        this.json = true;
    }
}
function getWellFromProject(wellName, idProject, token) {
    console.log('http://' + config.Service.project + '/project/well/info-by-name');
    return new Promise(function (resolve, reject) {
        let options = new Options('/project/well/info-by-name', token, { name: wellName, idProject: idProject });
        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                if (body.content) {
                    resolve(body.content);
                } else {
                    reject(body)
                }
            }
        });
    });
}
function getWellFromProjectById(idWell, token) {
    return new Promise(function (resolve, reject) {
        let options = new Options('/project/well/full-info', token, { idWell: idWell });
        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                if (body.content) {
                    resolve(body.content);
                } else {
                    reject(body)
                }
            }
        });
    });
}

function getCurveFromProject(name, idDataset, token) {
    return new Promise(function (resolve, reject) {
        let options = new Options('/project/well/dataset/curve/info-by-name', token, { name: name, idDataset: idDataset });
        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                if (body.content) {
                    resolve(body.content);
                } else {
                    reject(body)
                }
            }
        });
    });
}
function getDatasetFromProjectById(idDataset, token) {
    return new Promise(function (resolve, reject) {
        let options = new Options('/project/well/dataset/info', token, { idDataset: idDataset });
        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                if (body.content) {
                    resolve(body.content);
                } else {
                    reject(body)
                }
            }
        });
    });
}
function getDatasetFromProjectByName(name, idWell, token) {
    return new Promise(function (resolve, reject) {
        let options = new Options('/project/well/dataset/info-by-name', token, { name: name, idWell: idWell });
        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                if (body.content) {
                    resolve(body.content);
                } else {
                    reject(body)
                }
            }
        });
    });
}
async function importWell(well, token, callback, username) {
    try {
        let _well = await getWellFromProject(well.name, well.idProject, token);
        let topDepth = _well.well_headers.find(h => h.header === 'TOP').value;
        let bottomDepth = _well.well_headers.find(h => h.header === 'STOP').value;
        let step = _well.well_headers.find(h => h.header === 'STEP').value;
        models.Well.findOrCreate({
            where: { name: _well.name, username: username },
            defaults: {
                name: _well.name,
                filename: _well.name,
                username: username
            }
        }).then(newWell => {
            newWell = newWell[0];
            asyncEach(_well.datasets, function (dataset, eachCb) {
                models.Dataset.findOrCreate({
                    where: { idWell: newWell.idWell, name: dataset.name },
                    defaults: {
                        idWell: newWell.idWell,
                        name: dataset.name,
                        unit: "M",
                        top: topDepth,
                        bottom: bottomDepth,
                        step: step
                    }
                }).then(function (newDataset) {
                    newDataset = newDataset[0];
                    let queue = asyncQueue(function (curve, cb) {
                        let options = {
                            method: 'POST',
                            url: 'http://' + config.Service.project + '/project/well/dataset/curve/getDataFile',
                            headers:
                                {
                                    Authorization: token,
                                    'Content-Type': 'application/json'
                                },
                            body: { idCurve: curve.idCurve },
                            json: true
                        };
                        models.Curve.create({
                            name: curve.name,
                            idDataset: newDataset.idDataset
                        }).then(async function (c) {
                            let _curve = c;
                            let projectCurve = await getCurveFromProject(curve.name, dataset.idDataset, token);
                            let revision = await models.CurveRevision.create({
                                idCurve: _curve.idCurve,
                                isCurrentRevision: 1,
                                unit: projectCurve.unit,
                                startDepth: topDepth,
                                stopDepth: bottomDepth,
                                step: step
                            })
                            // const key = hashDir.getHashPath(username + _well.name + dataset.name + curve.name + curveData.unit + curveData.step) + curveData.name + '.txt';
                            // let curvePath = await curveModel.getCurveKey(revision);

                            let filePath = hashDir.createPath(config.dataPath, username + newWell.name + newDataset.name + curve.name, curve.name + '.txt');
                            console.log('filePath', filePath);
                            // fs.mkdirSync("./thuy");
                            let writeStream = hashDir.createWriteStream(config.dataPath, username + newWell.name + newDataset.name + curve.name, curve.name + '.txt');
                            // let stream = await s3.getData(curvePath);
                            try {
                                let stream = request(options).pipe(writeStream);
                                writeStream.on('close', async function () {
                                    console.log('stream end');
                                    const key = hashDir.getHashPath(username + newWell.name + newDataset.name + curve.name + revision.unit + revision.step) + curve.name + '.txt';
                                    await s3.upload(filePath, key)
                                        .then(data => {
                                            console.log(data.Location);
                                            cb(null, _curve);
                                        }).catch(err => {
                                            cb(err);
                                            console.log(err);
                                        });
                                });
                                stream.on('error', function (err) {
                                    cb(err);
                                });
                            } catch (err) {
                                cb(err);
                            }
                        }).catch(err => {
                            models.Curve.findOne({
                                where: {
                                    name: curve.name,
                                    idDataset: newDataset.idDataset
                                }
                            }).then(function (foundCurve) {
                                cb(null, foundCurve);
                            }).catch(function (e) {
                                cb(e, null);
                            })
                        })
                    }, 2);
                    queue.drain = function () {
                        eachCb();
                    };
                    dataset.curves.forEach(function (curve) {
                        queue.push(curve, function (err, success) {
                            if (err) {
                                eachCb(err);
                            }
                        });
                    });
                }).catch(function (err) {
                    eachCb(err);
                })
            }, function (err) {
                if (err) {
                    callback(err);
                } else {
                    let wellHeaders = _well.well_headers;
                    asyncEach(wellHeaders, function (wellHeader, next) {
                        models.WellHeader.findOrCreate({
                            where: { header: wellHeader.header, idWell: newWell.idWell }, defaults: {
                                header: wellHeader.header,
                                value: wellHeader.value,
                                desciption: wellHeader.desciption || "",
                                idWell: newWell.idWell
                            }
                        })
                    });
                    callback(null, newWell);
                }
            });
        }).catch(err => {
            if (err.name === "SequelizeUniqueConstraintError") {
                models.Well.findOne({
                    where: {
                        name: _well.name
                    }
                }).then(existedWell => {
                    callback(null, existedWell);
                });
            } else {
                callback(err);
            }
        })
    } catch (e) {
        callback(e);
    }
}
function importDataset(datasets, token, callback, username) {
    let response = [];
    asyncEach(datasets, function (dataset, next) {
        getDatasetFromProjectById(dataset.idDataset, token).then(function (returnDataset) {
            if (returnDataset) {
                console.log('idDesWell', dataset.idDesWell);

                models.Dataset.findOrCreate({
                    where: { name: returnDataset.name, idWell: dataset.idDesWell },
                    defaults: {
                        name: returnDataset.name,
                        idWell: dataset.idDesWell,
                        unit: returnDataset.unit,
                        top: returnDataset.top,
                        bottom: returnDataset.bottom,
                        step: returnDataset.step,
                    }
                }).then(rs => {
                    let _dataset = rs[0];
                    _dataset.curves = [];
                    asyncEach(returnDataset.curves, function (curve, nextCurve) {
                        setTimeout(function () {
                            curve.idDesDataset = _dataset.idDataset;
                            importCurveDataFromProject(curve, dataset.idDataset, token, function (err, result) {
                                if (err) {
                                    // response.push(err);
                                    nextCurve();
                                } else {
                                    // response.push(result);
                                    _dataset.curves.push(result);
                                    nextCurve();
                                }
                            }, username);
                        }, 100);
                    }, function () {
                        response.push(_dataset);
                        next();
                    });
                }).catch(err => {
                    response.push(err);
                    next();
                });
            } else {
                cb(" dataset not found");
            }
        }).catch(function (err) {
            cb(err, null);
        });
    }, function (error) {
        if (error) {
            callback(error);
        } else {
            callback(null, response);
        }
    });
}

async function importCurves(curves, token, callback, username) {
    let response = [];
    asyncEach(curves, function (curve, next) {
        setTimeout(function () {
            models.Well.findOrCreate({
                where: {
                    name: curve.wellName,
                    username: username
                }, defaults: {
                    name: curve.wellName,
                    filename: curve.wellName,
                    username: username
                }
            }).then(async function (well) {
                well = well[0];
                let projectWell = await getWellFromProject(curve.wellName, curve.idProject, token);
                models.Dataset.findOrCreate({
                    where: {
                        idWell: well.idWell,
                        name: curve.datasetName
                    }, defaults: {
                        idWell: curve.idWell,
                        name: curve.datasetName,
                        top: projectWell.topDepth,
                        bottom: projectWell.bottomDepth,
                        step: projectWell.step,
                        unit: "M"
                    }
                }).then(async function (dataset) {
                    dataset = dataset[0];
                    curve.idDesDataset = dataset.idDataset
                    let projectDataset = await getDatasetFromProjectByName(curve.datasetName, projectWell.idWell, token)
                    // ================================
                    console.log('projectDataset', curve.datasetName, projectWell.idWell);
                    importCurveDataFromProject(curve, projectDataset.idDataset, token, function (err, result) {
                        if (err) {
                            response.push(err);
                        } else {
                            console.log('ok');
                            response.push(result);
                        }
                        next();
                    }, username);
                }).catch(function (err) {
                    response.push(err);
                })
            }).catch(function (err) {
                response.push(err);
            })
        }, 100);
    }, function () {
        callback(null, response);
    });
}

async function importCurveDataFromProject(curveInfo, idDataset, token, callback, username) {
    let options = {
        method: 'POST',
        url: 'http://' + config.Service.project + '/project/well/dataset/curve/getDataFile',
        headers:
            {
                Authorization: token,
                'Content-Type': 'application/json'
            },
        body: { idCurve: curveInfo.idCurve },
        json: true
    };
    let dataset = await datasetModel.findDatasetById(curveInfo.idDesDataset, username);
    let well = await wellModel.findWellById(dataset.idWell, username, { datasets: true, well_headers: true });
    let curve = {
        name: curveInfo.name,
        idDataset: curveInfo.idDesDataset
    }
    models.Curve.findOrCreate({
        where: { name: curve.name, idDataset: dataset.idDataset },
        defaults: {
            name: curve.name,
            idDataset: dataset.idDataset
        }
    }).then(async function (c) {
        let _curve = c[0];
        let projectCurve = await getCurveFromProject(curve.name, idDataset, token);
        let revision = await models.CurveRevision.findOrCreate({
            where: { idCurve: _curve.idCurve },
            defaults: {
                idCurve: _curve.idCurve,
                isCurrentRevision: 1,
                unit: projectCurve.unit,
                startDepth: well.datasets[0].top,
                stopDepth: well.datasets[0].bottom,
                step: well.datasets[0].step
            }
        })
        // const key = hashDir.getHashPath(username + _well.name + dataset.name + curve.name + curveData.unit + curveData.step) + curveData.name + '.txt';
        revision = revision[0];
        let curvePath = await curveModel.getCurveKey(revision);

        let filePath = hashDir.createPath(config.dataPath, username + well.name + dataset.name + _curve.name, _curve.name + '.txt');
        console.log('filePath', filePath);
        // fs.mkdirSync("./thuy");
        let writeStream = hashDir.createWriteStream(config.dataPath, username + well.name + dataset.name + _curve.name, _curve.name + '.txt');
        let stream = await s3.getData(curvePath);
        try {
            let stream = request(options).pipe(writeStream);
            writeStream.on('close', async function () {
                console.log('stream end');
                const key = hashDir.getHashPath(username + well.name + dataset.name + _curve.name + revision.unit + revision.step) + _curve.name + '.txt';
                await s3.upload(filePath, key)
                    .then(data => {
                        callback(null, _curve);
                        console.log('_curve', curve);
                    })
                    .catch(err => {
                        console.log(err);
                    });
            });
            stream.on('error', function (err) {
                callback(err, null);
            });
        } catch (err) {
            console.log("err 4", err);
            callback(err, null);
        }
    }).catch(err => {
        console.log('err 3', err);
        callback(err, null);
    })
}


module.exports = {
    importCurves: importCurves,
    importDataset: importDataset,
    importWell: importWell
}