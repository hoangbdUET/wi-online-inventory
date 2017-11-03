"use strict";
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let models = require('../../models/index');
let Curve = models.Curve;
let Well = models.Well;
let File = models.File;
let User = models.User;
let curveExport = require('../../export/curveExport');
let response = require('../response');
let deleteEmpty = require('delete-empty');
let config = require('config');

router.use(bodyParser.json());

router.post('/curve/new', function (req, res) {
    Curve.create(req.body).then(curve => {
        res.send(response(200, 'SUCCESSFULLY CREATE NEW CURVE', curve));
    }).catch(err => {
        res.send(response(500, 'FAILED TO CREATE NEW CURVE', err));
    });
});

router.post('/curve/info', function (req, res) {
    Curve.findById(req.body.idCurve, {
        include : {
        model: Well,
            attributes : [],
            required: true,
            include: {
            model: File,
                attributes: [],
                required: true,
                include: {
                model: User,
                    attributes: [],
                    required: true,
                    where: {
                        idUser: req.decoded.idUser
                }
            }
        }
    },
        logging: console.log
    }).then(curve => {
        if (curve) {
            res.send(response(200, 'SUCCESSFULLY GET CURVE INFOR', curve));
        } else {
            res.send(response(200, 'NO CURVE FOUND BY ID'));
        }
    }).catch(err => {
        res.send(response(500, 'FAILED TO FIND CURVE', err));
    });
});

router.post('/curve/data', function (req, res) {
    Curve.findById(req.body.idCurve, {
        include : {
            model: Well,
            attributes : [],
            required: true,
            include: {
                model: File,
                attributes: [],
                required: true,
                include: {
                    model: User,
                    attributes: [],
                    required: true,
                    where: {
                        idUser: req.decoded.idUser
                }
            }
        }
    }})
        .then((curve) => {
            if (curve) {
                curveExport(curve, req.body.unit, (err, readStream) => {
                    if(!err){
                        readStream.pipe(res);
                    }
                });
            } else {
                res.send(response(200, 'NO CURVE FOUND BY ID'));
            }
        })
        .catch((err) => {
            res.send(response(500, 'FAILED TO FIND CURVE', err));
        })
})

router.post('/curve/edit', function (req, res) {
    Curve.findById(req.body.idCurve, {
        include : {
        model: Well,
            attributes : [],
            required: true,
            include: {
            model: File,
                attributes: [],
                required: true,
                include: {
                model: User,
                    attributes: [],
                    required: true,
                    where: {
                    idUser: req.decoded.idUser
                }
            }
        }
    }
    }).then(curve => {
        if (curve) {
            Object.assign(curve, req.body);
            curve.save().then(c => {
                res.send(response(200, 'SUCCESSFULLY EDIT CURVE', c));
            }).catch(e => {
                res.send(response(500, 'FAILED TO EDIT CURVE', e));
            })
        } else {
            res.send(response(200, 'NO CURVE FOUND FOR EDIT'));
        }
    }).catch(err => {
        res.send(response(500, 'FAILED TO FIND CURVE', err));
    });
});

router.post('/curve/delete', function (req, res) {
    Curve.findById(req.body.idCurve, {
        include : {
            model: Well,
            attributes : [],
            required: true,
            include: {
                model: File,
                attributes: [],
                required: true,
                include: {
                    model: User,
                    attributes: [],
                    required: true,
                    where: {
                        idUser: req.decoded.idUser
                    }
                }
            }
        }
    }).then(curve => {
        if (curve) {
            let curvePath = curve.path;
            curve.destroy({paranoid: true})
                .then( () => {
                    if(config.s3Path){
                    }
                    else {
                        require('fs').unlinkSync(curvePath);
                        deleteEmpty(config.dataPath, () => {

                        });
                    }
                    res.send(response(200, 'SUCCESSFULLY DELETE CURVE', curve));
            });
            //be sure to delete curve file on disk
        } else {
            res.send(response(500, 'NO CURVE FOUND FOR DELETE'));
        }
    }).catch(err => {
        res.send(response(500, 'FAILED TO FIND CURVE', err));
    });
});

router.post('/curves', function (req, res) {
    Curve.findAll({
        where: {
            idWell: req.body.idWell
        },
        include : {
            model: Well,
            attributes : [],
            required: true,
            include: {
                model: File,
                attributes: [],
                required: true,
                include: {
                    model: User,
                    attributes: [],
                    required: true,
                    where: {
                        idUser: req.decoded.idUser
                    }
                }
            }
        },
        logging: console.log
    })
        .then((curves) => {
            res.send(response(200, 'SUCCESSFULLY GET CURVES', curves));
        })
        .catch((err) => {
            res.send(response(500, 'FAILED TO FIND CURVES', err));
        })
})


module.exports = router;
