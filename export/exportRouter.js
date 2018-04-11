let express = require('express');
let router = express.Router();
let fs = require('fs');
let path = require('path');
let config = require('config');
let byline = require('byline');
let request = require('request');
let models = require('../server/models');
let Well = models.Well;
let async = require('async');
let response = require('../server/response');
const s3 = require('../server/s3');
let exporter = require('wi-export-test');

router.post('/well', function (req, res) {
    console.log('STARTTIME', new Date());
    exporter.exportLas2FromInventory(config.exportPath, req.body.idObjs, models, req.decoded.username, s3, function(err, result){
        if(err){
            res.send(response(404, err));
        } else {
            console.log('ENDTIME', new Date());
            res.send(response(200, 'SUCCESSFULLY', result));
        } 
    })
})

module.exports = router;