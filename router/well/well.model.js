'use strict'
let models = require('../../models');
let Well = models.Well;
let File = models.File;
let User = models.User;
let Curve = models.Curve;

function findWellById(idWell, idUser) {
    return Well.findById(
        idWell,
        {
            include : [{
                model: File,
                attributes: [],
                include : [ {
                    model: User,
                    attributes: [],
                    where: { idUser : idUser},
                    required: true
                }],
                required : true
            }, {
                model: Curve
            }],
            logging: console.log
        })
}

function deleteCurves(curves) {
    console.log('~~~deleteCurves~~~');
    let fs = require('fs');
    let deleteEmpty = require('delete-empty');
    let config = require('config');
    let asyncLoop = require('node-async-loop');
    asyncLoop(curves, (curve, next)=> {
        if(!config.s3Path) {
            fs.unlink(curve.path, (err, rs)=>{
                if(err) console.log(err);
                next();
            });
        }
        else {
            next();
        }
    }, (err) => {
        deleteEmpty(config.dataPath, (err) => {
            if (err) console.log(err);
        })
        if(err) console.log('end asyncloop:' + err);
    })
}

function deleteWell(well, callback) {
    let curves = well.curves;
    well.destroy({paranoid: true})
        .then((rs)=>{
            deleteCurves(curves);
            callback(null, rs);
        })
        .catch((err)=>{
            callback(err, null);
        })
}
module.exports = {
    findWellById: findWellById,
    deleteWell: deleteWell
}