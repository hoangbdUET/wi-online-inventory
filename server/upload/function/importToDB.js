'use strict'

const models = require('../../models');
const WellHeader = require('../wellHeader');
const hashDir = require('wi-import').hashDir;
const s3 = require('../../s3');
const config = require('config');
const asyncEach = require('async/each');
const fs = require('fs');
const curveModel = require('../../curve/curve.model');
const readline = require('readline');

async function importCurves(curves, dataset) {
    if (!curves || curves.length <= 0) return;
    const promises = curves.map(async curveData => {
        try {
            curveData.idDataset = dataset.idDataset;
            let curve = await models.Curve.create(curveData);

            curveData.idCurve = curve.idCurve;
            curveData.isCurrentRevision = true;
            const curveRevision = await models.CurveRevision.create(curveData);

            if (config.s3Path) {
                const key = hashDir.getHashPath(dataset.username + dataset.wellname + dataset.name + curveData.name + curveData.unit + curveData.step) + curveData.name + '.txt';
                await s3.upload(config.dataPath + '/' + curveData.path, key)
                    .then(data => {
                        console.log(data.Location);
                    })
                    .catch(err => {
                        console.log(err);
                    });
                curveRevision.path = key;
                curveRevision.save();
            }
            else if (curveData.wellname !== dataset.wellname || curveData.datasetname !== dataset.name) {
                const oldCurve = {
                    username: dataset.username,
                    wellname: curveData.wellname,
                    datasetname: curveData.datasetname,
                    curvename: curveData.name,
                    unit: curveData.unit,
                    step: curveData.step
                }
                const newCurve = {
                    username: dataset.username,
                    wellname: dataset.wellname,
                    datasetname: dataset.name,
                    curvename: curveData.name,
                    unit: curveData.unit,
                    step: curveData.step
                };
                const changeSet = {};
                curveRevision.path = await require('../../fileManagement').moveCurveFile(oldCurve, newCurve);
                curveRevision.save();
            }
            return curve;
        } catch (err) {
            // console.log('-------->' + err);
            // throw err;
            if (err.name === 'SequelizeUniqueConstraintError')
                return await models.Curve.findOne({
                    where: {
                        name: curveData.name,
                        idDataset: dataset.idDataset
                    }
                });
            else {
                console.log('-------->' + err);
                throw err;
            }
        }

    });
    return Promise.all(promises);
}

async function importWell(wellData, override) {
    try {
        // console.log("==wellData ", wellData, wellData.name, wellData.username);
        let well
        const Op = require('sequelize').Op;

        if(override){
            const rs = await models.Well.findOrCreate({
                where: {
                    [Op.and]: [
                        {name: {[Op.eq]: wellData.name}},
                        {username: wellData.username},
                    ]
                },
                defaults: {
                    name: wellData.name, username: wellData.username, filename: wellData.filename
                },
                include: {
                    model: models.WellHeader
                }
            });
            well = rs[0];
            if(rs[1] == false){
                updateWellSTRT_STOP(well, wellData);
            }
        } else {
            well = await models.Well.create(wellData);
        }

        well.datasets = await importDatasets(wellData.datasets, well, true);

        let arr = ['username', 'datasets', 'name', 'params'];
        for (let property in WellHeader) {
            let well_header = {};
            if (wellData[WellHeader[property].LASMnemnics]) {
                well_header = wellData[WellHeader[property].LASMnemnics];
                delete wellData[WellHeader[property].LASMnemnics];
            }
            else if (wellData[WellHeader[property].CSVMnemnics]) {
                well_header = wellData[WellHeader[property].CSVMnemnics];
                delete wellData[WellHeader[property].CSVMnemnics];;
            }
            arr.push(property);
            well_header.idWell = well.idWell;
            well_header.header = property;
            models.WellHeader.upsert(well_header)
                .catch(err => {
                    console.log('=============' + err)
                })
        }

        for (let header in wellData) {
            if (!arr.includes(header))
                models.WellHeader.upsert({
                    idWell: well.idWell,
                    header: header,
                    value: wellData[header].value,
                    description: wellData[header].description,
                    standard: false
                }).catch(err => {
                    console.log(err)
                })
        }
        return well;
    } catch (err) {
        console.log('===' + err + "===> It's ok, rename now")
        if (err.name === 'SequelizeUniqueConstraintError') {
            if (wellData.name.indexOf(' ( copy ') < 0) {
                wellData.name = wellData.name + ' ( copy 1 )';
            }
            else {
                let copy = wellData.name.substr(wellData.name.lastIndexOf(' ( copy '), wellData.name.length);
                let copyNumber = parseInt(copy.replace(' ( copy ', '').replace(' )', ''));
                copyNumber++;
                wellData.name = wellData.name.replace(copy, '') + ' ( copy ' + copyNumber + ' )';
            }
            return await
                importWell(wellData);
        }
        else {
            throw err;
        }
    }
}

async function importDatasets(datasets, well, override) {
    //override = true means that override dataset
    // console.log("---------------------->>>> " + JSON.stringify(well));
    if (!datasets || datasets.length <= 0) return;
    try {
        const promises = datasets.map(async datasetData => {
            let dataset = null;
            datasetData.idWell = well.idWell;
            if (datasetData.idDataset) {
                dataset = await models.Dataset.findOne({
                    where: {
                        idDataset: datasetData.idDataset
                    }
                })
            }
            else if (override) {
                dataset = await models.Dataset.findOne({
                    where: {
                        name: datasetData.name,
                        idWell: well.idWell
                    }
                })
            }

            async function createDataset(datasetInfo) {
                try {
                    const dataset = await models.Dataset.create(datasetInfo);
                    return dataset;
                } catch (err){
                    console.log('>>>>>>>' + err + "===> It's ok, rename dataset now")
                    if (err.name === 'SequelizeUniqueConstraintError') {
                        if (datasetData.name.indexOf(' ( copy ') < 0) {
                            datasetData.name = datasetData.name + ' ( copy 1 )';
                        }
                        else {
                            let copy = datasetData.name.substr(datasetData.name.lastIndexOf(' ( copy '), datasetData.name.length);
                            let copyNumber = parseInt(copy.replace(' ( copy ', '').replace(' )', ''));
                            copyNumber++;
                            datasetData.name = datasetData.name.replace(copy, '') + ' ( copy ' + copyNumber + ' )';
                        }
                        return await createDataset(datasetData);
                    }
                    else {
                        throw err;
                    }
                }
            }

            if (!dataset) dataset = await createDataset(datasetData);

            dataset = dataset.toJSON();
            dataset.wellname = well.name;
            dataset.username = well.username;

            datasetData.params.forEach(param => {
                param.idDataset = dataset.idDataset;
                models.DatasetParams.create(param)
                    .catch(err => {
                        console.log('import to well_parameter failed ===> ' + err);
                    });
            });
            const curves = await importCurves(datasetData.curves, dataset);
            dataset.curves = curves;
            return dataset;
        });
        return Promise.all(promises);
    } catch (err) {
        throw err;
    }

}

async function importToDB(inputWells, importData) {
    console.log('importToDB inputWell: ' + JSON.stringify(inputWells));
    if (!inputWells || inputWells.length <= 0) return cb('there is no well to import');
    const promises = inputWells.map(async inputWell => {
        try {
            inputWell.username = importData.userInfo.username;
            if (inputWell.STRT && inputWell.STOP && inputWell.STEP && inputWell.NULL) {
                inputWell.STRT.value = inputWell.STRT.value.replace(/,/g, "");
                inputWell.STOP.value = inputWell.STOP.value.replace(/,/g, "");
                inputWell.STEP.value = inputWell.STEP.value.replace(/,/g, "");
                inputWell.NULL.value = inputWell.NULL.value.replace(/,/g, "");
            }
            return await importWell(inputWell, importData.override);
        } catch (err) {
            console.log('===> ' + err);
            throw err;
        }
    });
    return Promise.all(promises);
}


function updateWellSTRT(well, wellData) {
    const STRT = well.well_headers.find((header) => {
        if(header.header == "TOP") return header;
    });
    console.log("updateWellSTRT: " + wellData.STRT.value + ' ' + STRT.value + ' ' + wellData.STEP.value)
    if(STRT.value <= wellData.STRT.value){
        const numberOfNull = Math.floor((wellData.STRT.value - STRT.value) / wellData.STEP.value);

        if(numberOfNull == 0) return;
        for(let dataset of wellData.datasets){
            for(let curve of dataset.curves){
                let data = fs.readFileSync(config.dataPath + '/' + curve.path, 'utf8');
                let dataArr = data.split('\n');
                dataArr = dataArr.map(item => {
                    return item.split(' ')[1];
                })
                for(let i = 0; i < numberOfNull; i++){
                    dataArr.unshift('null');
                }

                fs.unlinkSync(config.dataPath + '/' + curve.path);
                let idx = 0;
                for(let value of dataArr){
                    fs.appendFileSync(config.dataPath + '/' + curve.path, idx + ' ' + value + '\n');
                    idx++;
                }
            }
        }
        wellData.STRT.value = STRT.value;
    }
    else {
        const numberOfNull = Math.floor((STRT.value - wellData.STRT.value) / wellData.STEP.value);
        if(numberOfNull == 0) return;

        const tempDir = fs.mkdtempSync(require('path').join(require('os').tmpdir(), 'wi_inventory_'));
        models.Well.findById(well.idWell, {
            include: {
                model: models.Dataset,
                attributes: ['name'],
                include: {
                    model: models.Curve,
                    attributes: ['name'],
                    include: {
                        model: models.CurveRevision
                    }
                }
            }
        }).then(currentWell => {
            currentWell.datasets.forEach(dataset => {
                dataset.curves.forEach(curve => {
                    curve.curve_revisions.forEach(async revision => {
                        let curveDatas = [];
                        const tempPath = tempDir + '/' + Date.now() + '_' + revision.idRevision + '.txt';
                        const objKey = await curveModel.getCurveKey(revision);
                        const rl = readline.createInterface({
                            input: await s3.getData(objKey)
                        })
                        rl.on('line', line => {
                            curveDatas.push(Number(line.trim().split(' ')[1]));
                        })
                        rl.on('close', () => {
                            for(let i = 0; i < numberOfNull; i++){
                                curveDatas.unshift('null');
                            }
                            // fs.unlinkSync(tempPath);
                            let idx = 0;
                            for(let value of curveDatas){
                                fs.appendFileSync(tempPath, idx + ' ' + value + '\n');
                                idx++;
                            }
                            s3.upload(tempPath, objKey);
                        })
                    })
                })
            })
        })
            .catch(err => {
                console.log('==============> ' + err);
            })

    }
}

function updateWellSTOP() {
    const STOP = well.well_headers.find((header) => {
        if(header.header == "STOP") return header;
    });
    console.log("updateWellSTOP: " + wellData.STOP.value + ' ' + STOP.value + ' ' + wellData.STOP.value)
    if(STOP.value >= wellData.STOP.value){
        const numberOfNull = Math.floor((STOP.value - wellData.STOP.value) / wellData.STEP.value);
        if(numberOfNull == 0) return;
        for(let dataset of wellData.datasets){
            for(let curve of dataset.curves){
                let data = fs.readFileSync(config.dataPath + '/' + curve.path, 'utf8');
                let dataArr = data.split('\n');
                dataArr = dataArr.map(item => {
                    return item.split(' ')[1];
                })
                for(let i = 0; i < numberOfNull; i++){
                    dataArr.push('null');
                }

                fs.unlinkSync(config.dataPath + '/' + curve.path);
                let idx = 0;
                for(let value of dataArr){
                    fs.appendFileSync(config.dataPath + '/' + curve.path, idx + ' ' + value + '\n');
                    idx++;
                }
            }
        }
        wellData.STRT.value = STRT.value;
    }
}


function updateWellSTRT_STOP(well, wellData) {
    const STRT = well.well_headers.find((header) => {
        if(header.header == "TOP") return header;
    });
    const STOP = well.well_headers.find((header) => {
        if(header.header == "STOP") return header;
    });

    console.log("updateWellSTRT: " + wellData.STRT.value + ' ' + STRT.value + ' ' + wellData.STEP.value)
    console.log("updateWellSTOP: " + wellData.STOP.value + ' ' + STOP.value + ' ' + wellData.STEP.value)

    if(STRT.value <= wellData.STRT.value || STOP.value >= wellData.STOP.value){
        const numberOfNullPrepend = Math.floor((wellData.STRT.value - STRT.value) / wellData.STEP.value);
        const numberOfNullAppend = Math.floor((STOP.value - wellData.STOP.value) / wellData.STEP.value);

        for (let dataset of wellData.datasets) {
            for (let curve of dataset.curves) {
                let data = fs.readFileSync(config.dataPath + '/' + curve.path, 'utf8');
                let dataArr = data.split('\n');
                dataArr = dataArr.map(item => {
                    return item.split(' ')[1];
                })
                for (let i = 0; i < numberOfNullPrepend; i++) {
                    dataArr.unshift('null');
                }

                for (let i = 0; i < numberOfNullAppend; i++) {
                    dataArr.push('null');
                }

                fs.unlinkSync(config.dataPath + '/' + curve.path);
                let idx = 0;
                for (let value of dataArr) {
                    fs.appendFileSync(config.dataPath + '/' + curve.path, idx + ' ' + value + '\n');
                    idx++;
                }
            }
        }
        if(numberOfNullPrepend > 0) wellData.STRT.value = STRT.value;
        if(numberOfNullAppend > 0) wellData.STRT.value = STOP.value;
    }

    if(STRT.value > wellData.STRT.value || STOP.value < wellData.STOP.value) {

        const numberOfNullPrepend = Math.floor((STRT.value - wellData.STRT.value) / wellData.STEP.value);
        const numberOfNullAppend = Math.floor((wellData.STOP.value - STOP.value) / wellData.STEP.value);

        const tempDir = fs.mkdtempSync(require('path').join(require('os').tmpdir(), 'wi_inventory_'));
        models.Well.findById(well.idWell, {
            include: {
                model: models.Dataset,
                attributes: ['name'],
                include: {
                    model: models.Curve,
                    attributes: ['name'],
                    include: {
                        model: models.CurveRevision
                    }
                }
            }
        }).then(currentWell => {
            currentWell.datasets.forEach(dataset => {
                dataset.curves.forEach(curve => {
                    curve.curve_revisions.forEach(async revision => {
                        let curveDatas = [];
                        const tempPath = tempDir + '/' + Date.now() + '_' + revision.idRevision + '.txt';
                        const objKey = await curveModel.getCurveKey(revision);
                        const rl = readline.createInterface({
                            input: await s3.getData(objKey)
                        })
                        rl.on('line', line => {
                            curveDatas.push(Number(line.trim().split(' ')[1]));
                        })
                        rl.on('close', () => {
                            for(let i = 0; i < numberOfNullPrepend; i++){
                                curveDatas.unshift('null');
                            }
                            for(let i = 0; i < numberOfNullAppend; i++){
                                curveDatas.push('null');
                            }
                            // fs.unlinkSync(tempPath);
                            let idx = 0;
                            for(let value of curveDatas){
                                fs.appendFileSync(tempPath, idx + ' ' + value + '\n');
                                idx++;
                            }
                            s3.upload(tempPath, objKey);
                        })
                    })
                })
            })
        })
            .catch(err => {
                console.log('==============> ' + err);
            })

    }
}

module.exports = importToDB;
