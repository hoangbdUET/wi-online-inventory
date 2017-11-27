"use strict";

var express = require("express");
var router = express.Router();
var asyncLoop = require("node-async-loop");
var multer = require('multer');
let response = require('../response');
const lasProcessing = require('./lasProcessing');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

let upload = multer({storage: storage});

router.post('/upload/lases', upload.array('file'), function (req, res)  {
    console.log(req.files);
    //req.body.importInfo = { well, dataset } => if exists, create well and dataset
    let output = new Array();
    asyncLoop(req.files, (file, next) => {
        if(!file) return next('NO FILE CHOSEN!!!');
        lasProcessing.processFileUpload(file, req.decoded, (err, result) => {
            if(err) next(err)
            else {
                output.push(result);
                next();
            }
        });
    }, (err) => {
        if(err) res.send(response(500, 'UPLOAD FILES FAILED', err));
        else res.send(response(200, 'UPLOAD FILES SUCCESS', output));
    })

})

module.exports = router;