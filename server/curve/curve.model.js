'use strict'
const models = require('../models');
const Well = models.Well;
const Dataset = models.Dataset;
const User = models.User;
const Curve = models.Curve;
const config = require('config');
const hashDir = require('../../extractors/hash-dir');
const s3 = require('../s3');
const readline = require('readline');
const asyncEach = require('async/each');

function createCurve(body, cb) {
    Curve.create(body).then(curve => {
        cb(null, curve);
    }).catch(err => {
        cb(err, null);
    });
}

function findCurveById(idCurve, username, attributes) {
    let include = [{
        model: Dataset,
        attributes: attributes && attributes.dataset ? attributes.dataset : [],
        required: true,
        include: {
            model: Well,
            attributes: attributes && attributes.well ? attributes.well : [],
            required: true,
            include: {
                model: User,
                attributes: attributes && attributes.user ? attributes.user : [],
                required: true,
                where: {
                    username: username
                }
            }
        }
    }]
    if (attributes && attributes.revision) {
        include.push({
            model: models.CurveRevision
        })
    }
    return Curve.findById(idCurve, {
        include: include
        //logging: console.log
    });
}

function deleteCurveFiles(curves) {
    //curves must be array
    console.log('~~~deleteCurveFiles~~~ ' + JSON.stringify(curves));
    if (!curves || curves.length <= 0) return;
    curves.forEach(curve => {
        console.log('===> ' + curve.name)
        curve.curve_revisions.forEach(async revision => {
            if (config.s3Path) {
                s3.deleteCurve(await getCurveKey(revision));
            }
            else {
                const path = config.dataPath + '/' + await getCurveKey(revision);
                require('fs').unlink(path, (err) => {
                    if (err) console.log('delete curve file failed: ' + err);
                });
            }
        })
    })
}

async function deleteCurve(idCurve, username) {
    const attributes = {
        revision: true
    }
    const curve = await findCurveById(idCurve, username, attributes);
    console.log(JSON.stringify(curve));
    curve.destroy()
        .then((rs) => {
            deleteCurveFiles([curve]);
            Promise.resolve(rs);
        })
        .catch((err) => {
            Promise.reject(err)
        })

}

async function getCurves(idDataset, username, cb) {
    try {
        const curves = await Curve.findAll({
            where: {
                idDataset: idDataset
            },
            include: [{
                model: Dataset,
                attributes: [],
                required: true,
                include: {
                    model: Well,
                    attributes: [],
                    required: true,
                    include: {
                        model: User,
                        attributes: [],
                        required: true,
                        where: {
                            username: username
                        }
                    }
                }
            }, {
                model: models.CurveRevision,
                where: {
                    isCurrentRevision: true
                }
            }],
            raw: true
            // logging: console.log
        });
        for (let curve of curves) {
            for (let property in curve) {
                if (property.indexOf('curve_revisions.') >= 0) {
                    curve[property.replace('curve_revisions.', '')] = curve[property];
                    delete curve[property];
                }
            }
        }
        return cb(null, curves);
    } catch (err) {
        console.log(err);
        return cb(err)
    }

}

async function editCurve(body, username, cb) {
    try {
        let attributes = {
            well: ['name'],
            dataset: ['name'],
            revision: true
        }
        let curve = await findCurveById(body.idCurve, username, attributes);
        let currentRevision = {};
        for (const revision of curve.curve_revisions) {
            if (revision.isCurrentRevision) currentRevision = revision;
        }
        curve.username = username;
        if (curve) {
            if (body.name && curve.name != body.name) editCurveName(curve, body.name, cb)
            else if (body.unit && body.unit != currentRevision.unit) editCurveUnit(curve, body.unit, cb)
            else if (body.step && body.step != currentRevision.step) editCurveStep(curve, body.step, cb)
            else return cb();
        }
        else {
            return cb('No curve found to edit')
        }
    } catch (err) {
        console.log('failed to edit curve: ' + err)
        cb(err);
    }

}

async function createRevision(curve, newUnit, newStep) {
    try {
        let currentRevision = {};
        for (const revision of curve.curve_revisions) {
            if (revision.isCurrentRevision) currentRevision = revision;
        }
        let newRevision = Object.assign({}, currentRevision.toJSON());
        currentRevision.isCurrentRevision = false;
        currentRevision.save();
        console.log(newRevision)
        const currentRevisionPath = await getCurveKey(currentRevision);
        delete newRevision.createdAt;
        delete newRevision.updatedAt;
        delete newRevision.idRevision;
        if (newStep) newRevision.step = newStep;
        else if (newUnit) newRevision.unit = newUnit;

        const oldPath = config.dataPath + '/' + currentRevisionPath;
        const dir = curve.username + curve.dataset.well.name + curve.dataset.name + curve.name + newRevision.unit + newRevision.step;
        const filePath = hashDir.createPath(config.dataPath, dir, curve.name + '.txt');
        newRevision.path = filePath.replace(config.dataPath + '/', '');
        if (newStep) curveInterpolation(currentRevision, newRevision);
        else if (newUnit) {
            if (config.s3Path) {
                s3.copyCurve(currentRevisionPath, newRevision.path);
            }
            else {
                const fs = require('fs');
                fs.createReadStream(oldPath).pipe(fs.createWriteStream(filePath));
            }
        }
        const updatedRevision = await models.CurveRevision.create(newRevision);

        return updatedRevision;
    }
    catch (err) {
        console.log('failed to create revision: ' + err)
        return null;
    }
}

async function editCurveName(curve, newName, cb) {
    try {
        const originalName = curve.name;
        curve.name = newName;
        const updatedCurve = await curve.save();
        for (const revision of curve.curve_revisions) {
            const hashStr = curve.username + curve.dataset.well.name + curve.dataset.name + newName + revision.unit + revision.step;
            const path = hashDir.getHashPath(hashStr) + newName + '.txt';
            const oldCurve = {
                username: curve.username,
                wellname: curve.dataset.well.name,
                datasetname: curve.dataset.name,
                curvename: originalName,
                unit: revision.unit,
                step: revision.step
            }
            const newCurve = Object.assign({}, oldCurve);
            newCurve.curvename = newName;
            // revision.path = path;
            await revision.save();
            require('../fileManagement').moveCurveFile(oldCurve, newCurve);
        }
        return cb(null, updatedCurve)
    } catch (err) {
        console.log(err);
        cb(err);
    }
}

async function editCurveUnit(curve, newUnit, cb) {
    try {
        let currentRevision = {};
        let updatedCurve = {};
        for (const revision of curve.curve_revisions) {
            if (revision.isCurrentRevision) currentRevision = revision;
        }

        let isRevisionExisted = false;
        for (let revision of curve.curve_revisions) {
            if (revision.unit == newUnit && revision.step == currentRevision.step) {
                revision.isCurrentRevision = true;
                isRevisionExisted = true;
                updatedCurve = await revision.save();
            }
        }
        if (!isRevisionExisted) {
            updatedCurve = await createRevision(curve, newUnit);
        }
        return cb(null, updatedCurve);

    } catch (err) {
        console.log(err);
        cb(err);
    }
}

async function editCurveStep(curve, newStep, cb) {
    try {
        let currentRevision = {};
        let steps = [];
        let updatedCurve = {};
        for (const revision of curve.curve_revisions) {
            if (revision.isCurrentRevision) currentRevision = revision;
            if (!steps.includes(revision.step)) steps.push(revision.step);
        }
        let isRevisionExisted = false;
        for (let revision of curve.curve_revisions) {
            if (revision.step == newStep && revision.unit == currentRevision.unit) {
                currentRevision.isCurrentRevision = false;
                currentRevision.save();

                revision.isCurrentRevision = true;
                isRevisionExisted = true;
                updatedCurve = await revision.save();
                break;
            }
        }
        if (!isRevisionExisted) {
            updatedCurve = await createRevision(curve, null, newStep);
        }
        cb(null, updatedCurve);
    } catch (err) {
        console.log(err);
        cb(err);
    }
}

async function curveInterpolation(originRevision, newRevision) {
    const fs = require('fs');
    let curveDatas = [];

    const originRevisionPath = await getCurveKey(originRevision);


    if (config.s3Path) {
        const tempDir = fs.mkdtempSync(require('path').join(require('os').tmpdir(), 'wi_inventory_'));
        const tempPath = tempDir + '/' + Date.now() + '_' + originRevision.idRevision + '.txt';
        // const writeStream = fs.createWriteStream(pathOnDisk);
        const rl = readline.createInterface({
            input: await s3.getData(originRevisionPath)
        })
        rl.on('line', line => {
            curveDatas.push(Number(line.trim().split(' ')[1]));
        })
        rl.on('close', () => {
            console.log('=++++++++++++++++++++++++++=====>')
            const numberOfPoint = Math.floor((Number(newRevision.stopDepth) - Number(newRevision.startDepth)) / Number(newRevision.step));
            for (let i = 0; i < numberOfPoint; i++) {
                const originIndex = i * newRevision.step / originRevision.step;
                if (Number.isInteger(originIndex)) {
                    fs.appendFileSync(tempPath, i + ' ' + curveDatas[originIndex] + '\n');
                }
                else {
                    const preIndex = Math.floor(originIndex);
                    const postIndex = Math.ceil(originIndex);
                    const value = (curveDatas[postIndex] - curveDatas[preIndex]) * (originIndex - preIndex) / (postIndex - preIndex) + curveDatas[preIndex];
                    fs.appendFileSync(tempPath, i + ' ' + value + '\n');
                }
            }
            s3.upload(tempPath, newRevision.path);
        })
    } else {
        const originPath = config.dataPath + '/' + originRevisionPath;
        const path = config.dataPath + '/' + newRevision.path;
        const curveContents = fs.readFileSync(originPath, 'utf8').trim().split('\n');
        for (const line of curveContents) {
            curveDatas.push(Number(line.trim().split(' ')[1]));
        }
        const numberOfPoint = Math.floor((Number(newRevision.stopDepth) - Number(newRevision.startDepth)) / Number(newRevision.step));
        for (let i = 0; i < numberOfPoint; i++) {
            const originIndex = i * newRevision.step / originRevision.step;
            if (Number.isInteger(originIndex)) {
                fs.appendFileSync(path, i + ' ' + curveDatas[originIndex] + '\n');
            }
            else {
                const preIndex = Math.floor(originIndex);
                const postIndex = Math.ceil(originIndex);
                const value = (curveDatas[postIndex] - curveDatas[preIndex]) * (originIndex - preIndex) / (postIndex - preIndex) + curveDatas[preIndex];
                fs.appendFileSync(path, i + ' ' + value + '\n');
            }
        }
    }
}

function findWellByCurveName(curveNames, callback, username) {
    let maps = [];
    asyncEach(curveNames, function (curveName, nextCurveName) {
        let wells = [];
        Curve.findAll({where: {name: curveName}}).then(curves => {
            asyncEach(curves, function (curve, nextCurve) {
                Dataset.findById(curve.idDataset).then(dataset => {
                    Well.findById(dataset.idWell).then(well => {
                        if (well.username === username) {
                            wells.push(dataset.idWell);
                        }
                        nextCurve();
                    });
                });
            }, function () {
                maps.push(wells);
                nextCurveName();
            });
        });
    }, function (err) {
        let wellArray = maps[0];
        let response = [];
        for (let i = 1; i < maps.length; i++) {
            wellArray = wellArray.filter(idWell => maps[i].includes(idWell));
        }
        asyncEach(wellArray, function (idWell, next) {
            Well.findById(idWell).then(well => {
                response.push({wellName: well.name, idWell: well.idWell});
                next();
            });
        }, function () {
            callback(null, response);
        })
    });
}

async function getCurveKey(curveRevision){
    try {
        const revision = await  models.CurveRevision.findById(curveRevision.idRevision, {
            include: {
                model: models.Curve,
                attributes: ['name'],
                include: {
                    model: models.Dataset,
                    attributes: ['name'],
                    include: {
                        model: models.Well,
                        attributes: ['name'],
                        include: {
                            model: models.User,
                            attributes: ['username']
                        }
                    }
                }
            }

        });
        const hashStr = revision.curve.dataset.well.user.username + revision.curve.dataset.well.name + revision.curve.dataset.name + revision.curve.name + revision.unit + revision.step;
        const key = hashDir.getHashPath(hashStr) + revision.curve.name + '.txt';
        return Promise.resolve(key);
    } catch(err){
        return Promise.reject(err);
    }
}

module.exports = {
    findCurveById: findCurveById,
    deleteCurve: deleteCurve,
    getCurves: getCurves,
    deleteCurveFiles: deleteCurveFiles,
    createCurve: createCurve,
    editCurve: editCurve,
    findWellByCurveName: findWellByCurveName,
    getCurveKey: getCurveKey
};