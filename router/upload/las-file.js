"use strict";

var express = require("express");
var router = express.Router();
var config = require("config");
var multer = require('multer');
var fs = require("fs");
var wi_import = require("../../import-module");

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

var upload = multer({storage: storage});

router.post('/upload/las', upload.single('file'), function (req, res) {
    console.log(req.file);
    wi_import.setBasePath(config.dataPath);
    wi_import.extractLAS2(req.file.path, function (err, result) {
        if (err) console.log(err);
        console.log(result);
    });
    console.log(wi_import.getBasePath());
    res.status(200).send("DONE");
});

module.exports = router;