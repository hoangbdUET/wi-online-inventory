const models = require('../../models');
const asyncEach = require('async/each');
const asyncSeries = require('async/series');

let importToDB = async function (wells, userInfo, callback) {
    console.log("====", wells);
    let well = wells[0];
    well.username = userInfo.username;
    try {
        let newWell = await models.Well.findOrCreate({
            where: {name: well.name, username: well.username},
            defaults: well
        });
        if (newWell[0]) {
            asyncEach(well.datasets, async function (dataset, nextDataset) {
                dataset.idWell = newWell[0].idWell;
                let newDataset = await models.Dataset.findOrCreate({
                    where: {name: dataset.name, idWell: dataset.idWell},
                    defaults: dataset
                });
                if (newDataset[0]) {
                    asyncEach(dataset.curves, async function (curve, nextCurve) {
                        curve.idDataset = newDataset[0].idDataset;
                        let newCurve = await models.Curve.findOrCreate({
                            where: {
                                name: curve.name,
                                idDataset: curve.idDataset
                            }, defaults: curve
                        });
                        nextCurve();
                    }, function () {
                        console.log("DONE CURVE");
                    });
                }
                nextDataset();
            }, function () {

            });
        } else {
            throw ("No well created");
        }
        callback(null, newWell);
    } catch (err) {
        console.log(err);
        callback(err, null);
    }

}

module.exports = importToDB;