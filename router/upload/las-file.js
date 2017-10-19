"use strict";

var express = require("express");
var router = express.Router();
var config = require("config");
var multer = require('multer');
var fs = require("fs");
var wi_import = require("../../import-module");
var asyncLoop = require("node-async-loop");
var Well = require("../../models").Well;
var Curve = require("../../models").Curve;

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

var upload = multer({storage: storage});

let LAS2Done = function (result, callback) {
    let wellInfo = new Object();
    wellInfo.name = result.wellname;
    wellInfo.startDepth = result.start;
    wellInfo.stopDepth = result.stop;
    wellInfo.step = result.step;
    let curves = result.datasetInfo[0].curves;
    Well.create(wellInfo).then(well => {
        asyncLoop(curves, function (curve, next) {
            curve.idWell = well.idWell;
            curve.name = curve.datasetname + "_" + curve.name;
            Curve.create({
                name: curve.name,
                idWell: curve.idWell,
                unit: curve.unit,
                path: curve.path
            }).then(() => {
                next();
            }).catch(err => {
                console.log(err);
                next();
            });
        }, function (err) {
            callback(err, null);
        });
    }).catch(err => {
        console.log("WELL NAME EXISTED : ", err.message);
        callback(err, null);
    });
}

router.post('/upload/las', upload.single('file'), function (req, res) {
    wi_import.setBasePath(config.dataPath);
    wi_import.extractLAS2(req.file.path, function (err, result) {
        if (err) console.log(err);
        LAS2Done(result, function (err, rs) {
            if (err) return res.status(500).send(err.message);
            res.status(200).send(result);
        });
    });

});

module.exports = router;