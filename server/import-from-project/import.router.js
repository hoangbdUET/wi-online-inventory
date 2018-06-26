let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let ResponseJSON = require('../response');
let model = require('./import.model');

router.use(bodyParser.json());

router.post('/curve', function (req, res) {
    let token = req.body.token || req.query.token || req.header['x-access-token'] || req.get('Authorization');
    let curves = req.body.curves;
    model.importCurves(curves, token, function (error, response) {
        if(error) {
            res.send(ResponseJSON(512, error));
        } else {
            res.send(ResponseJSON(200, "Successful", response));            
        }
    }, req.decoded.username);
})
router.post('/dataset', function (req, res) {
    let token = req.body.token || req.query.token || req.header['x-access-token'] || req.get('Authorization');
    let datasets = req.body.datasets;
    model.importDataset(datasets, token, function (error,response) {
        if(error) {
            res.send(ResponseJSON(512, error));
        } else {
            res.send(ResponseJSON(200, "Successful", response));            
        }
    }, req.decoded.username);
})
router.post('/well', function (req, res) {
    let token = req.body.token || req.query.token || req.header['x-access-token'] || req.get('Authorization');
    let well = req.body;
    model.importWell(well, token, function (error, response) {
        if(error) {
            res.send(ResponseJSON(512, error));
        } else {
            res.send(ResponseJSON(200, "Successful", response));            
        }
    }, req.decoded.username);
})


module.exports = router;