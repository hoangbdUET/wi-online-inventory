"use strict";
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let models = require('../../models/index');
let File = models.File;
let Well = models.Well;
let Curve = models.Curve;
let response = require('../response');
let curveModel = require('../curve/curve.model');

router.use(bodyParser.json());

function deleteCurves(curves) {
    console.log('~~~deleteCurves~~~');
    let asyncLoop = require('node-async-loop');
    asyncLoop(curves, (curve, next)=> {
        curveModel.deleteCurveFile(curve.path);
        next();
    }, (err) => {
        if(err) console.log('end asyncloop:' + err);
    })
}

router.post('/file/new', function (req, res) {
    File.create(req.body).then(file => {
        res.send(response(200, 'SUCCESSFULLY CREATE NEW FILE', file));
    }).catch(err => {
        res.send(response(500, 'FAILED TO CREATE NEW FILE', err));
    });
});

router.post('/file/info', function (req, res) {
    console.log(req.body);
    File.findOne({
        where: {
            idFile: req.body.idFile,
            idUser:req.decoded.idUser
        }
    }).then(file => {
        if (file) {
            res.send(response(200, 'SUCCESSFULLY GET FILE INFOR', file));
        } else {
            res.send(response(200, "NO FILE FOUND BY ID"));
        }
    }).catch(err => {
        res.send(response(500, 'FAILED TO FIND FILE', err));
    });
});

router.post('/file/edit', function (req, res) {
    File.findOne({
        where: {
            idFile: req.body.idFile,
            idUser: req.decoded.idUser
        }}).then(file => {
        if (file) {
            Object.assign(file, req.body);
            file.save().then(c => {
                res.send(response(200, 'SUCCESSFULLY EDIT FILE', c));
            }).catch(err => {
                res.send(response(500, 'FAILED TO EDIT FILE', err));
            })
        } else {
            res.send(response(500, "NO FILE FOUND FOR EDIT"));
        }
    }).catch(err => {
        res.send(response(500, 'FAILED TO FIND FILE', err));
    });
});

router.post('/file/delete', function (req, res) {
    File.findOne({
        where: {
            idUser: req.decoded.idUser,
            idFile: req.body.idFile
        },
        include: {
            model: Well,
            include: {
                model: Curve
            }
        }
    }).then(file => {
        if (file) {
            let curves;
            file.wells.forEach((well)=> {
                if(!curves) curves = well.curves;
                else curves.push.apply(curves, well.curves);
            });
            file.destroy()
                .then(() => {
                    deleteCurves(curves);
                    res.send(response(200, 'SUCCESSFULLY DELETE FILE', file));
                })
            //be sure to detele all curves of file on disk
        } else {
            res.send(response(500, "NO FILE FOUND FOR DELETE"));
        }
    }).catch(err => {
        res.send(response(500, 'FAILED TO FIND FILE', err));
    });
});

router.post('/files', function (req, res) {
    File.findAll({
        where: {
            idUser: req.decoded.idUser
        }
    })
        .then((files) => {
            res.send(response(200, 'SUCCESSFULLY GET FILES', files));
        })
        .catch((err) => {
            res.send(response(500, 'FAILED TO GET FILES', err));
        })
})


module.exports = router;
