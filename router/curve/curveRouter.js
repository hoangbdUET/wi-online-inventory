"use strict";
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let models = require('../../models/index');
let Curve = models.Curve;
let curveExport = require('../../export/curveExport');

router.use(bodyParser.json());

router.post('/curve/new', function (req, res) {
    Curve.create(req.body).then(curve => {
        res.status(200).send(curve);
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/curve/info', function (req, res) {
    console.log(req.body.idCurve);
    Curve.findById(req.body.idCurve).then(curve => {
        if (curve) {
            res.status(200).send(curve);
        } else {
            res.status(200).send("NO CURVE FOUND BY ID");
        }
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/curve/data', function (req, res) {
    Curve.findById(req.body.idCurve)
        .then((curve) => {
            if (curve) {
                curveExport(curve, req.body.unit, (err, curve) => {
                    if(!err){
                        res.status(200).sendFile(curve.path);
                    }
                });
            } else {
                res.status(200).send("NO CURVE FOUND BY ID");
            }
        })
        .catch((err) => {
            res.status(500).send(err);
        })
})

router.post('/curve/edit', function (req, res) {
    Curve.findById(req.body.idCurve).then(curve => {
        if (curve) {
            Object.assign(curve, req.body);
            curve.save().then(c => {
                res.status(200).send(c);
            }).catch(e => {
                res.status(500).send("ERR");
            })
        } else {
            res.status(200).send("NO CURVE FOUND FOR EDIT");
        }
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/curve/delete', function (req, res) {
    Curve.destroy({
        where: {
            idCurve: req.body.idCurve
        }
    }).then(curve => {
        if (curve) {
            res.status(200).send(curve);
        } else {
            res.status(500).send("NO CURVE FOUND FOR DELETE");
        }
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/curves', function (req, res) {
    Curve.findAll({
        where: {
            idWell: req.body.idWell
        }
    })
        .then((curves) => {
            res.status(200).send(curves);
        })
        .catch((err) => {
            res.status(500).send(err);
        })
})


module.exports = router;
