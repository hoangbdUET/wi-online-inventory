'use strict'
let models = require('../../models');
let Well = models.Well;
let Dataset = models.Dataset;
let User = models.User;
let Curve = models.Curve;
let config = require('config');

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
    if(attributes.revision){
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

        if (curve) {
            let currentRevision = {};
            let units = [];
            let steps = [];
            for(const revision of curve.curve_revisions){
                if(revision.isCurrentRevision) currentRevision = revision;
                if(!units.includes(revision.unit)) units.push(revision.unit);
                if(!steps.includes(revision.step)) steps.push(revision.step);
            }
            const originCurve = curve.toJSON();
            let updatedCurve = {};

            if (body.name && originCurve.name != body.name) {
                body.path = require('../../extractors/hash-dir').getHashPath(username + curve.dataset.well.name + curve.dataset.name + body.name) + body.name + '.txt';
                Object.assign(curve, body);
                updatedCurve = curve.save();
                const oldCurve = {
                    username: username,
                    wellname: curve.dataset.well.name,
                    datasetname: curve.dataset.name,
                    curvename: originCurve.name
                }
                const newCurve = Object.assign({}, oldCurve);
                newCurve.curvename = body.name;
                require('../fileManagement').moveCurveFile(oldCurve, newCurve);
                return cb(null ,updatedCurve)
            }

            if(body.unit && body.unit != currentRevision.unit){
                if(!units.includes(body.unit)){
                    currentRevision.isCurrentRevision = false;
                    currentRevision.save();
                    //create new revision;
                    currentRevision = currentRevision.toJSON();
                    delete currentRevision.idRevision;
                    currentRevision.unit = body.unit;
                    currentRevision.isCurrentRevision = true;
                    updatedCurve = createRevision(currentRevision);
                    return cb(null, updatedCurve);
                }else {
                    currentRevision.isCurrentRevision = false;
                    currentRevision.save();
                    for(let revision of curve.curve_revisions){
                        if(revision.unit == body.unit){
                            revision.isCurrentRevision = true;
                            updatedCurve = await revision.save();
                            break;
                        }
                    }
                    cb(null, updatedCurve);
                }
            }

            if(body.step && body.step != currentRevision.step){
                if(!steps.includes(body.step)){
                    currentRevision.isCurrentRevision = false;
                    currentRevision.save();
                    //create new revision;
                    currentRevision = currentRevision.toJSON();
                    delete currentRevision.idRevision;
                    currentRevision.step = body.step;
                    currentRevision.isCurrentRevision = true;
                    updatedCurve = createRevision(currentRevision);
                    return cb(null, updatedCurve);
                }else {
                    currentRevision.isCurrentRevision = false;
                    currentRevision.save();
                    for(let revision of curve.curve_revisions){
                        if(revision.step == body.step){
                            revision.isCurrentRevision = true;
                            updatedCurve = await revision.save();
                            break;
                        }
                    }
                    cb(null, updatedCurve);
                }
            }
        }
        else {
            return cb('No curve found to edit')
        }
    } catch(err) {
        console.log('failed to edit curve: ' + err)
        cb(err);
    }

}

async function createRevision(revision) {
    return await models.CurveRevision.create(revision)
        .catch(err => {
            console.log('failed to create revision: ' + err)
        })
}



module.exports = {
    findCurveById: findCurveById,
    deleteCurve : deleteCurve,
    getCurves: getCurves,
    deleteCurveFiles: deleteCurveFiles,
    createCurve: createCurve,
    editCurve: editCurve
}