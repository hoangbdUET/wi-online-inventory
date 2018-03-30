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

router.post('/well', function (req, res) {
    let token = req.body.token || req.query.token || req.headers['x-access-token'] || req.get('Authorization');
    let responseArray = []; 
    Well.findById(req.body.idObj.idWell, {
        include: [{
            model: models.WellHeader
        }, {
            model: models.Dataset,
            include: {
                model: models.Curve,
                include: {
                    model: models.CurveRevision
                }
            }
        }]
    }).then(function(well){
        if(well) {
            console.log('req.body', req.body.idObj.datasets);
            if(req.body.idObj.datasets.length===1){
                console.log("req.body.idObj.datasets.length===1")
                let idDataset = req.body.idObj.datasets[0].idDataset; 
                let idCurves = req.body.idObj.datasets[0].idCurves;  
                console.log('id dataset and curves ', idDataset, idCurves); 
                exportWell(req, res, well, idDataset, idCurves, responseArray,  req.decoded.username, function(err){
                    if(err){
                        res.send(response(404, 'SOMETHING WENT WRONG'));
                    } else {
                        res.send(response(200, 'SUCCESSFULLY', responseArray));
                    }
                }); 
            } else {
                console.log("req.body.idObj.datasets.length!==1")
                async.each(req.body.idObj.datasets, function(datasetItem, callback){
                    let idDataset = datasetItem.idDataset;
                    let idCurves = datasetItem.idCurves;
                    exportWell(req, res, well, idDataset, idCurves, responseArray,  req.decoded.username, callback);
                }, function(err) {
                    if(err) {
                        console.log('err', err);        
                        res.send(response(404, 'SOMETHING WENT WRONG'));
                    } else {
                        console.log('callback called');
                        res.send(response(200, 'SUCCESSFULLY', responseArray));
                    }
                })
            }
        } else {
            res.send(response(404, 'WELL NOT FOUND'));
        }
    });
})

function exportWell (req, res, well, idDataset, idCurves, responseArray, username, callback){   
    let exportPath = config.exportPath;
    if(!fs.existsSync(exportPath)){
        fs.mkdirSync(exportPath);
    }
    let lasFilePath = path.join(exportPath, req.decoded.username);
    if (!fs.existsSync(lasFilePath)){
        fs.mkdirSync(lasFilePath);
    }
    let dataset = well.datasets.find(function(dataset){ return dataset.idDataset==idDataset;});
    
    if(dataset){
        let fileName = dataset.name + "_" + well.name + "_" + Date.now() + '.las'
        lasFilePath = path.join(lasFilePath, fileName );
        writeVersion(lasFilePath);
        writeWellHeader(lasFilePath, well.well_headers);
        writeCurve(res, lasFilePath, well, dataset, idCurves, fileName, responseArray, username, callback);                   
        let lasFileUrl = path.join(config.exportPath, req.decoded.username, well.name + '.las');
    } else {
            responseArray.push(null);   
            callback(); 
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

async function writeCurve(res, lasFilePath, well, dataset, idCurves, fileName, responseArray, username, callback) {  
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
            let curvePath = curve.curve_revisions[0].path;
            top.push(Number.parseFloat(dataset.top));
            bottom.push(Number.parseFloat(dataset.bottom));
            step.push(Number.parseFloat(dataset.step));
            paths.push(curvePath);
            fs.appendFileSync(lasFilePath, curve.name + '.' + curve.unit + '  :\r\n');
            curveColumns += curve.name + '   ';
        }
    }
    if(paths.length===0){
        responseArray.push(null);
        callback();
    } else {
        fs.appendFileSync(lasFilePath, '~Parameter\r\n');
        fs.appendFileSync(lasFilePath, '#MNEM.UNIT       Value                        Description\r\n');
        fs.appendFileSync(lasFilePath, '#---------       ---------                    -------------\r\n');
        fs.appendFileSync(lasFilePath, curveColumns + '\r\n');

        //append curve  ver2
        let readStreams = [];
        let writeStream = fs.createWriteStream(lasFilePath, {flags: 'a'});

        for (let path of paths) {
            // let stream = fs.createReadStream(path);
            let stream = await s3.getData(path);
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
                            callback();
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
                    responseArray.push({
                        path:  path.join(config.exportPath, well.username, fileName),
                        wellName: well.name,
                        datasetName: dataset.name
                    }); 
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