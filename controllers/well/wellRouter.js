"use strict";
let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
let models = require('../../models/index');
let Well = models.Well;
let response = require('../response');
let wellModel = require('./well.model');
const lasProcessing = require('../upload/lasProcessing');

const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({storage: storage});

router.use(bodyParser.json());

router.post('/well/new', function (req, res) {
    Well.create(req.body).then(well => {
        res.send(response(200, 'SUCCESSFULLY CREATE NEW WELL', well));
    }).catch(err => {
        res.send(response(500, 'FAILED TO CREATE NEW WELL', err));
    });
});

router.post('/well/info', function (req, res) {
    wellModel.findWellById(req.body.idWell, req.decoded.username)
        .then(well => {
            if (well) {
                models.WellHeader.findAll({
                    where: {
                        idWell: well.idWell
                    }
                }).then(headers => {
                    well = well.toJSON();
                    headers.forEach(header => {
                        well[header.header] = header.value;
                    })
                    res.send(response(200, 'SUCCESSFULLY GET WELL INFOR', well));
                }).catch(err => {
                    console.log(err);
                    res.send(response(200, 'SUCCESSFULLY GET WELL INFOR', well));
                })

            } else {
                res.send(response(200, 'NO WELL FOUND BY ID'));
            }
        }).catch(err => {
        res.send(response(500, 'FAILED TO FIND WELL', err));
    });
});

router.post('/well/edit', function (req, res) {
    wellModel.findWellById(req.body.idWell, req.decoded.username)
        .then(well => {
            if (well) {
                Object.assign(well, req.body);
                well.save().then(c => {
                    res.send(response(200, 'SUCCESSFULLY EDIT WELL', c));
                }).catch(e => {
                    res.send(response(500, 'FAILED TO EDIT WELL', e));
                })
            } else {
                res.send(response(200, 'NO WELL FOUND TO EDIT'));
            }
        }).catch(err => {
        res.send(response(500, 'FAILED TO FIND WELL', err));
    });
});

router.post('/well/delete', function (req, res) {
    wellModel.deleteWell(req.body.idWell, req.decoded.username, (err, rs) => {
        if(!err) res.send(response(200, 'SUCCESSFULLY DELETE WELL', rs));
        else {
            console.log(err);
            res.send(response(200, 'FAILED TO DELETE WELL: ', err));
        }
    });
});

router.post('/well/addDatasets', upload.array('file'), function (req, res) {
    //this route is for upload and import datasets to an existing well
    //req.body.idWell
    lasProcessing.uploadLasFiles(req, (err, result)=> {
        if(err) res.send(response(500, 'ADD DATASETS FAILED'));
        else res.send(response(200, 'SUCCESSFULLY ADD DATASETS', result));
    })

})

router.post('/well/copyDatasets', function (req, res) {
    //copy datasets from another well
    //req.body.datasets = [], req.body.idWell
    wellModel.copyDatasets(req, (err, rs)=> {
        if(err) res.send(response(500, 'COPY DATASETS FAILED', err));
        else res.send(response(200, 'SUCCESSFULLY COPY DATASETS', rs));
    })
})

router.post('/wells', function (req, res) {
    Well.findAll({
        where: {
            username: req.decoded.username,
         }
    })
        .then((wells) => {
            res.send(response(200, 'SUCCESSFULLY GET WELLS', wells));
        })
        .catch((err) => {
            res.send(response(500, 'FAILED TO GET WELLS', err));
        })
})

module.exports = router;
