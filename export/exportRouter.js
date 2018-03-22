var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
let config = require('config');
var byline = require('byline');
var models = require('../models');
var Well = models.Well;
var Dataset = models.Dataset;
var Curve = models.Curve;
var async = require('async');
let response = require('../controllers/response');

router.post('/wells', function (req, res) {
    Well.findAll({
        include: [{
            model: models.WellHeader
        }, {
            model: Dataset,
            include: {
                model: Curve,
                include: {
                    model: models.CurveRevision
                }
            }
        }]
    }).then(wells => {
        res.send(wells);
    })
})
router.post('/well', function (req, res) {
    let responsePath = [];  /*2*/
    // async.each(req.body.idObj, function(idObj, callback){ /*2*/
        // Well.findById(idObj.idWell, {  /*2*/
        Well.findById(req.body.idObj.idWell, { /*1*/
            include: [{
                model: models.WellHeader
            }, {
                model: Dataset,
                include: {
                    model: Curve,
                    include: {
                        model: models.CurveRevision
                    }
                }
            }]
        })
        .then(well => {
            if(well){
                if(req.body.idObj.datasets.length==1){
                    let idDataset = req.body.idObj.datasets[0].idDataset; /*1*/
                    let idCurves = req.body.idObj.datasets[0].idCurves;  /*1*/
                    console.log('id dataset and curves ', idDataset, idCurves); /*1*/
                    // let idDataset = wellItem.dataset.idDataset; /*2*/
                    // let idCurves = wellItem.dataset.idCurves;   /*2*/
                    // exportWell(req, res, well, idDataset, idCurves, responsePath, callback);  /*2*/
                    exportWell(req, res, well, idDataset, idCurves, responsePath); /*1*/
                } else {
                    async.each(req.body.idObj.datasets, function(datasetItem, callback){
                        let idDataset = datasetItem.idDataset;
                        let idCurves = datasetItem.idCurves;
                        exportWell(req, res, well, idDataset, idCurves, responsePath, callback);
                    }, function(err) {
                        if(err){
                            console.log('err', err);        
                            res.send(response(404, 'SOMETHING WENT WRONG'));
                        } else {
                            console.log('callback called');
                            res.send(response(200, 'SUCCESSFULLY', responsePath));
                        }
                    })
                }
            } else {
                // responsePath.push('err');    /*2*/
                res.send(response(404, 'WELL NOT FOUND')); /*1*/
            }
        })
    // }, function (err) {  /*2*/
    //         if(err){
    //             console.log('err', err);        
    //             res.send(response(404, 'SOMETHING WENT WRONG'));
    //         } else {
    //             console.log('callback called');
    //             res.send(response(200, 'SUCCESSFULLY', responsePath));
    //         }
    //     })
})
function exportWell (req, res, well, idDataset, idCurves, responsePath, callback){    /*2*/
// function exportWell(req, res, well, idDataset, idCurves){    /*1*/

    if (well.username == req.decoded.username) {

        let lasFilePath = path.join(config.exportPath, req.decoded.username);
        if (!fs.existsSync(lasFilePath)){
            fs.mkdirSync(lasFilePath);
        }
        let dataset = well.datasets.find(function(dataset){ return dataset.idDataset==idDataset;});
        if(dataset){
            let fileName = dataset.name + "_" + well.name + "_" + Date.now() + '.las'
            lasFilePath = path.join(lasFilePath, fileName );
            writeVersion(lasFilePath);
            writeWellHeader(lasFilePath, well.well_headers);
            if(callback){
                writeCurve(res, lasFilePath, well, dataset, idCurves, fileName, responsePath, callback);    /*2*/                
            } else {
                writeCurve(res, lasFilePath, well, dataset, idCurves, fileName); /*1*/
            }
            let lasFileUrl = path.join(config.exportWebPath, req.decoded.username, well.name + '.las');
        } else {
            if(callback){
                res.send(response(404, 'DATASET NOT FOUND')); /*1*/                
            } else {
                responsePath.push("err");    /*2*/
            }
        }
        
    } else {
        // responsePath.push("err");    /*2*/
        res.send(response(404, 'WELL NOT FOUND'));  /*1*/
    }
}

function writeVersion(lasFilePath) {
    fs.appendFileSync(lasFilePath, '~Version\r\n');
    fs.appendFileSync(lasFilePath, 'VERS .        2      : CWLS LAS Version 2.0 \r\n');
    fs.appendFileSync(lasFilePath, 'WRAP .        NO     : One Line per Depth Step \r\n');
}

function writeWellHeader(lasFilePath, wellHeaders) {
    fs.appendFileSync(lasFilePath, '~Well\r\n');
    fs.appendFileSync(lasFilePath, '#MNEM.UNIT       Data Type                    Information\r\n');
    fs.appendFileSync(lasFilePath, '#---------       ---------                    -------------------------------\r\n');
    //append start depth, stop depth and step
    let strtHeader = ' STRT.M     ';
    let stopHeader = ' STOP.M     ';
    let stepHeader = ' STEP.M     ';
    for (i in wellHeaders) {
        if (wellHeaders[i].header === 'STRT') {
            strtHeader += wellHeaders[i].value;
            strtHeader = spaceAfter(36, strtHeader);
        }
        if (wellHeaders[i].header === 'STOP') {
            stopHeader += wellHeaders[i].value;
            stopHeader = spaceAfter(36, stopHeader);
        }
        if (wellHeaders[i].header === 'STEP') {
            stepHeader += wellHeaders[i].value;
            stepHeader = spaceAfter(36, stepHeader);
        }
    }
    fs.appendFileSync(lasFilePath, strtHeader + ": START DEPTH\r\n");
    fs.appendFileSync(lasFilePath, stopHeader + ": STOP DEPTH\r\n");
    fs.appendFileSync(lasFilePath, stepHeader + ": STEP\r\n");
    //append other headers
    for (i in wellHeaders) {
        let header = " " + wellHeaders[i].header.toString() + '.';
        header = spaceAfter(12, header);
        header += wellHeaders[i].value;
        header = spaceAfter(36, header);
        if (wellHeaders[i].value && wellHeaders[i].header !== 'filename' && wellHeaders[i].header !== 'COMPANY' && wellHeaders[i].header !== 'STRT' && wellHeaders[i].header !== 'STOP' && wellHeaders[i].header !== 'STEP') {
            fs.appendFileSync(lasFilePath, header + ": " + findInfo(wellHeaders[i].header.toString()) + '\r\n');
        }
    }
}

function writeCurve(res, lasFilePath, well, dataset, idCurves, fileName, responsePath, callback) {  /*2*/
// function writeCurve(res, lasFilePath, well, dataset, idCurves, fileName){  /*1*/
    fs.appendFileSync(lasFilePath, '~Curve\r\n');
    fs.appendFileSync(lasFilePath, '#MNEM.UNIT       API Code            Curve    Description\r\n');
    fs.appendFileSync(lasFilePath, '#--------        --------------      -----    -------------------\r\n');
    fs.appendFileSync(lasFilePath, 'DEPTH.M  :\r\n');
    let paths = [];
    let top = [];
    let bottom = [];
    let step = [];
    let curveColumns = '~A  DEPTH   ';
    for (idCurve of idCurves) {
        let curve = dataset.curves.find(function(curve){return curve.idCurve==idCurve});
        if(curve){
            top.push(Number.parseFloat(dataset.top));
            bottom.push(Number.parseFloat(dataset.bottom));
            step.push(Number.parseFloat(dataset.step));
            curve.path = '../../../../../../' + config.dataPath + '/' + curve.curve_revisions[0].path;
            paths.push(curve.path);
            fs.appendFileSync(lasFilePath, curve.name + '.' + curve.curve_revisions[0].unit + '  :\r\n');
            curveColumns += curve.name + '   ';
        }
    }
    if(paths.length===0){
        res.send(response(404, 'CURVE NOT FOUND')); 
        // responsePath.push('err');/*2*/
        // callback();
    } else {
        fs.appendFileSync(lasFilePath, '~Parameter\r\n');
        fs.appendFileSync(lasFilePath, '#MNEM.UNIT       Value                        Description\r\n');
        fs.appendFileSync(lasFilePath, '#---------       ---------                    -------------\r\n');
        fs.appendFileSync(lasFilePath, curveColumns + '\r\n');

        //append curve  ver2
        let readStreams = [];
        var writeStream = fs.createWriteStream(lasFilePath, {flags: 'a'});

        for (let path of paths) {
            let stream = fs.createReadStream(path);
            stream = byline.createStream(stream);
            readStreams.push(stream);
        }
        let x = "";
        for (let i = 0; i < readStreams.length; i++) {
            let readLine = 0;    
            let writeLine = 0;
            readStreams[i].on('data', function (line) {
                readLine ++;
                let tokens = line.toString('utf8').split("||");
                x = tokens;
                tokens = tokens.toString().substring(tokens.toString().indexOf(" ") + 1);
                tokens = spaceBefore(18, tokens);
                if (i === 0) {
                    let depth = top[i].toFixed(4).toString();
                    depth = spaceBefore(15, depth);
                    tokens = depth + tokens;
                    top[i] += step[i];
                }

                if (i !== readStreams.length - 1) {
                    writeStream.write(tokens, function(){
                    })
                    readStreams[i].pause();
                    if (readStreams[i + 1].isPaused()) {
                        readStreams[i + 1].resume();
                    }
                } else {
                    writeStream.write(tokens+'\r\n', function () {
                        writeLine++;
                        if(readStreams.numLine && readStreams.numLine === writeLine) {      
                            console.log('number of line', readStreams.numLine, writeLine);
                            readLine = 0;
                            writeLine = 0;
                            readStreams.numLine = "";
                            if(callback){
                                callback(); 
                            } else {
                                res.send(response(200, 'SUCCESSFULLY', path.join(config.exportWebPath, well.username, fileName)));
                            }
                        }
                    });
                    readStreams[i].pause();
                    if (readStreams[0].isPaused()) {
                        readStreams[0].resume();
                    }
                }
            })
            readStreams[i].on('end', function () {
                if (i === readStreams.length - 1) {
                    readStreams.numLine = readLine;
                    if(callback){
                        responsePath.push(path.join(config.exportWebPath, well.username, fileName)); /*2*/
                    }
                    console.log('END TIME', new Date(), readStreams.numLine);
                } else {
                    readStreams[i+1].resume()
                }
            })
        }
    }    
}

function spaceBefore(width, string) {
    let l = string.length;
    for (let i = 0; i < width - l; i++) {
        string = " " + string;
    }
    return string;
}

function spaceAfter(width, string) {
    let l = string.length;
    for (let i = 0; i < width - l; i++) {
        string = string + " ";
    }
    return string;
}

function findInfo(unit) {
    let headers = [
    {
        unit: 'NULL',
        info: 'NULL'
    }, {
        unit: 'COMP',
        info: 'COMPANY NAME'
    }, {
        unit: 'WELL',
        info: 'WELL NAME'
    }, {
        unit: 'FLD',
        info: 'FIELD NAME'
    }, {
        unit: 'LOC',
        info: 'LOCATION'
    }, {
        unit: 'PROV',
        info: 'PROVINCE'
    }, {
        unit: 'COUN',
        info: 'COUNTRY'
    }, {
        unit: 'CTRY',
        info: 'COUNTRY'
    }, {
        unit: 'SRVC',
        info: 'SERVICE COMPANY'
    }, {
        unit: 'DATE',
        info: 'SERVICE DATE'
    }, {
        unit: 'UWI',
        info: 'UNIQUE WELL ID'
    }, {
        unit: 'LIC',
        info: 'LICENCE NUMBER'
    }, {
        unit: 'LATI',
        info: 'LATITUDE'
    }, {
        unit: 'LONG',
        info: 'LONGITUDE'
    }, {
        unit: 'GDAT',
        info: 'GEODETIC DATUM'
    }
    ]
    let info = "";
    for (header of headers) {
        if (header.unit === unit) {
            info = header.info;
        }
    }
    return info;
}

module.exports = router;