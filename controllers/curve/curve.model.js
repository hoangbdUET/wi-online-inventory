'use strict'
const models = require('../../models');
const Well = models.Well;
const Dataset = models.Dataset;
const User = models.User;
const Curve = models.Curve;
const config = require('config');
const hashDir = require('../../extractors/hash-dir');

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
        attributes : attributes && attributes.dataset ? attributes.dataset : [],
        required: true,
        include: {
            model: Well,
            attributes: attributes && attributes.well? attributes.well : [],
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
    if(attributes && attributes.revision){
        include.push({
            model: models.CurveRevision
        })
    }
    return Curve.findById(idCurve, {
        include : include
        //logging: console.log
    });
}

function deleteCurveFiles(curves) {
    //curves must be array
    console.log('~~~deleteCurveFiles~~~');
    if(!curves || curves.length <= 0) return;
    curves.forEach(curve => {
        if(config.s3Path){
            //be sure to delete all unit exported curve files
            require('../s3').deleteCurve(curve);
        }
        else {
            //be sure to delete all unit exported curve files
            curve.curve_revisions.forEach(revision => {
                const path = config.dataPath + '/' + revision.path;
                require('fs').unlink(path, (err) => {
                    if(err) console.log('delete curve file failed: ' + err);
                });
            })
        }
    })
}

async function deleteCurve(idCurve, username, callback) {
    const attributes = {
        revision: true
    }
    const curve = await findCurveById(idCurve, username, attributes);
    curve.destroy()
        .then((rs)=>{
            deleteCurveFiles([curve]);
            callback(null, rs);
        })
        .catch((err) => {
            callback(err, null);
        })

}

async function getCurves(idDataset, username, cb) {
    try {
        const curves = await Curve.findAll({
            where: {
                idDataset: idDataset
            },
            include : [{
                model: Dataset,
                attributes : [],
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
        for(let curve of curves){
            for(let property in curve){
                if(property.indexOf('curve_revisions.') >= 0){
                    curve[property.replace('curve_revisions.', '')] = curve[property];
                    delete curve[property];
                }
            }
        }
        return cb(null, curves);
    } catch (err){
        console.log(err);
        return cb(err)
    }

}

async function editCurve(body, username, cb){
    try {
        let attributes = {
            well: ['name'],
            dataset: ['name'],
            revision: true
        }
        let curve = await findCurveById(body.idCurve, username, attributes);
        let currentRevision = {};
        for(const revision of curve.curve_revisions){
            if(revision.isCurrentRevision) currentRevision = revision;
        }
        curve.username = username;
        if (curve) {
            if (body.name && curve.name != body.name) editCurveName(curve, body.name, cb)
            else if(body.unit && body.unit != currentRevision.unit) editCurveUnit(curve, body.unit, cb)
            else if(body.step && body.step != currentRevision.step) editCurveStep(curve, body.step, cb)
            else return cb();
        }
        else {
            return cb('No curve found to edit')
        }
    } catch(err) {
        console.log('failed to edit curve: ' + err)
        cb(err);
    }

}

async function createRevision(curve, revision) {
    try {
        delete revision.createdAt;
        delete revision.updatedAt;
        const oldPath = config.dataPath + '/' + revision.path;
        const dir = curve.username + curve.dataset.well.name + curve.dataset.name + curve.name + revision.unit + revision.step;
        const filePath = hashDir.createPath(config.dataPath, dir, curve.name + '.txt');
        revision.path = filePath.replace(config.dataPath + '/', '');
        const newRevision = await models.CurveRevision.create(revision);

        const fs = require('fs');
        fs.createReadStream(oldPath).pipe(fs.createWriteStream(filePath));
        return newRevision;
        // const desHashStr = newCurve.username + newCurve.wellname + newCurve.datasetname + newCurve.curvename + newCurve.unit + newCurve.step;
        // const desPath = hash_dir.createPath(config.dataPath, desHashStr , newCurve.curvename + '.txt');
    }
    catch(err) {
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
            revision.path = path;
            await revision.save();
            require('../fileManagement').moveCurveFile(oldCurve, newCurve);
        }
        return cb(null, updatedCurve)
    }catch (err) {
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
        currentRevision.isCurrentRevision = false;
        await currentRevision.save();
        let isRevisionExisted = false;
        for (let revision of curve.curve_revisions) {
            if (revision.unit == newUnit && revision.step == currentRevision.step) {
                revision.isCurrentRevision = true;
                isRevisionExisted = true;
                updatedCurve = await revision.save();
            }
        }
        if(!isRevisionExisted){
            currentRevision = currentRevision.toJSON();
            delete currentRevision.idRevision;
            currentRevision.unit = newUnit;
            currentRevision.isCurrentRevision = true;
            updatedCurve = await createRevision(curve, currentRevision);
        }
        return cb(null, updatedCurve);

    }catch (err){
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
        currentRevision.isCurrentRevision = false;
        currentRevision.save();
        let isRevisionExisted = false;
        for (let revision of curve.curve_revisions) {
            if (revision.step == newStep && revision.unit == currentRevision.unit) {
                revision.isCurrentRevision = true;
                isRevisionExisted = true;
                updatedCurve = await revision.save();
                break;
            }
        }
        if(!isRevisionExisted) {
            currentRevision.isCurrentRevision = false;
            currentRevision.save();
            //create new revision;
            currentRevision = currentRevision.toJSON();
            delete currentRevision.idRevision;
            currentRevision.step = newStep;
            currentRevision.isCurrentRevision = true;
            updatedCurve = await createRevision(curve, currentRevision);
        }
        cb(null, updatedCurve);
    }catch (err){
        console.log(err);
        cb(err);
    }
}

module.exports = {
    findCurveById: findCurveById,
    deleteCurve : deleteCurve,
    getCurves: getCurves,
    deleteCurveFiles: deleteCurveFiles,
    createCurve: createCurve,
    editCurve: editCurve
}