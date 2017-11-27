'use strict'

const express = require('express');
const router = express.Router();
const models = require('../../models');
const Dataset = models.Dataset;
const datasetModel = require('./dataset.model');
const response = require('../response');


router.post('/dataset/new', function (req, res) {
    datasetModel.createDataset(req.body, (err, dataset)=> {
        if(err) {
            res.send(response(500, 'FAILED TO CREATE NEW DATASET', err));
        }
        else {
            res.send(response(200, 'SUCCESSFULLY CREATE NEW DATASET', dataset));
        }
    })

});

router.post('/dataset/info', function (req, res) {
    console.log(req);
    datasetModel.findDatasetById(req.body.idDataset, req.decoded.idUser)
        .then(dataset => {
            if (dataset)
                res.send(response(200, "SUCCESSFULLY GET DATASET INFO", dataset));
            else {
                res.send(response(200, 'NO DATASET FOUND BY ID'));
            }
        })
        .catch(err => {
            res.send(response(500, "FAILED TO GET DATASET INFO", err));
        })
});

router.post('/dataset/delete', function (req, res) {
    datasetModel.deleteDataset(req.body.idDataset, req.decoded.idUser, (err, rs)=>{
        if(err) {
            res.send(response(500, "FAILED TO DELETE DATASET"));
        }
        else {
            res.send(response(200, "DATASET DELETED", rs));
        }
    })
})

router.post('/dataset/edit', function (req, res) {
    res.send(response(200, "chua lam cai nay nhe"));
})

router.post('dataset/addCurves', function (req, res) {
    //add curves to existing dataset
})

router.post('/datasets', function (req, res) {
    datasetModel.getDatasets(req.body.idWell, req.decoded.idUser)
        .then(datasets => {
            if (datasets.length > 0)
                res.send(response(200, "SUCCESSFULLY GET DATASTES", datasets));
            else
                res.send(response(200, "THERE IS NOT ANY DATASET TO SHOW"));
        })
        .catch(err => {
            res.send(response(500, "FAILED TO GET DATASETS", err));
        })
})

module.exports = router;