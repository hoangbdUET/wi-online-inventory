let express = require('express');
let router = express.Router();
let config = require('config');
let models = require('../server/models');
let response = require('../server/response');
const s3 = require('../server/s3');
let exporter = require('wi-export-test');
let curveModel = require('../server/curve/curve.model');

router.post('/well', function (req, res) {
    console.log('STARTTIME', new Date());
    exporter.exportLas2FromInventory(config.exportPath, req.body.idObjs, models, req.decoded.username, s3, curveModel, function(err, result){
        if(err){
            res.send(response(404, err));
        } else {
            console.log('ENDTIME', new Date());
            res.send(response(200, 'SUCCESSFULLY', result));
        } 
    })
})

module.exports = router;