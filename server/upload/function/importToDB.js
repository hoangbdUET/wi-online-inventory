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
const convert = require('../../utils/convert');

async function importCurves(curves, dataset) {
    if (!curves || curves.length <= 0) return;
    const promises = curves.map(async curveData => {
        try {
            // console.log(curveData);
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
                    step: curveData.step,
                    description: curveData.description
                };
                const newCurve = {
                    username: dataset.username,
                    wellname: dataset.wellname,
                    datasetname: dataset.name,
                    curvename: curveData.name,
                    unit: curveData.unit,
                    step: curveData.step,
                    description: curveData.description
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
        // console.log(wellData);
        let well, wellTop, wellStop, wellStep;
        const Op = require('sequelize').Op;

        if (override) {
            well = (await models.Well.findOrCreate({
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
            }))[0];
        } else {
            well = await models.Well.create(wellData);
        }
        well.datasets = await importDatasets(wellData.datasets, well, true);
        if (well.well_headers) {
            wellTop = well.well_headers.find(h => h.header === "STRT");
            wellStop = well.well_headers.find(h => h.header === "STOP");
            wellStep = well.well_headers.find(h => h.header === "STEP");
        }
        let arr = ['username', 'datasets', 'name', 'params'];
        for (let property in WellHeader) {
            let well_header = {};
            if (wellData[WellHeader[property].LASMnemnics]) {
                well_header = wellData[WellHeader[property].LASMnemnics];
                delete wellData[WellHeader[property].LASMnemnics];
            }
            else if (wellData[WellHeader[property].CSVMnemnics]) {
                well_header = wellData[WellHeader[property].CSVMnemnics];
                delete wellData[WellHeader[property].CSVMnemnics];
            }
            arr.push(property);
            well_header.idWell = well.idWell;
            well_header.header = property;
            if (well_header.header === "STEP" && wellStep) {
                well_header.unit = wellStep.unit;
                well_header.value = wellStep.value;
            }
            if (well_header.header === "STRT" && wellTop) {
                // console.log(well_header, wellTop.toJSON());
                if (well_header.unit !== wellTop.unit) {
                    well_header.value = convert.convertDistance(well_header.value, well_header.unit, wellTop.unit);
                    well_header.unit = wellTop.unit;
                }
                // console.log("START =============", well_header.value);
                well_header.value = well_header.value >= wellTop.value ? wellTop.value : well_header.value;

            }
            if (well_header.header === "STOP" && wellStop) {
                // console.log(well_header, wellStop.toJSON());
                if (well_header.unit !== wellStop.unit) {
                    well_header.value = convert.convertDistance(well_header.value, well_header.unit, wellStop.unit);
                    well_header.unit = wellStop.unit;
                }
                // console.log("STOP =============", well_header.value);
                well_header.value = well_header.value <= wellStop.value ? wellStop.value : well_header.value;
            }
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
                    unit: wellData[header].unit,
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
    // console.log("=========", datasets);
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
                } catch (err) {
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
    // console.log('importToDB inputWell: ' + JSON.stringify(inputWells));
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

module.exports = importToDB;
