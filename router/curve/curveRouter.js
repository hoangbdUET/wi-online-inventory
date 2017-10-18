"use strict";
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let models = require('../../models/index');
let Curve = models.Curve;

router.use(bodyParser.json());

router.post('/curve/new', function (req, res) {
    Curve.create(req.body).then(curve => {
        res.status(200).send(curve);
    }).catch(err => {
        res.status(500).send(err);
    });
});

router.post('/curve/info', function (req, res) {
    Curve.findById(req.body.idCurve).then(curve => {
        if (curve) {
            res.status(200).send(curve);
        } else {
            res.status(200).send("NO CURVE FOUND BI ID");
        }
    }).catch(err => {
        res.status(500).send(err);
    });
});

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

module.exports = router;
