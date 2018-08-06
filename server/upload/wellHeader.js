'use strict'

function WellHeader(name, LASMnemnics, CSVMnemnics) {
    this.name = name;
    this.LASMnemnics = LASMnemnics;
    this.CSVMnemnics = CSVMnemnics;
}

module.exports = {
    STRT : new WellHeader('Top depth', 'STRT', 'Top Depth'),
    STOP : new WellHeader('Bottom depth', 'STOP', 'Bottom Depth'),
    STEP : new WellHeader('Step', 'STEP', 'Step'),
    NULL : new WellHeader('Null value', 'NULL', 'Null value'),
    WELL : new WellHeader('WELL', 'WELL', 'WellName'),
    UWI : new WellHeader('UWI', 'UWI', 'Unique Well Identifier'),
    API : new WellHeader('API', 'API', 'API'),
    LATI : new WellHeader('Latitude', 'LATI', 'Latitude'),
    LONG : new WellHeader('Longtitude', 'LONG', 'Longtitude'),
    EASTING : new WellHeader('Easting (X)', 'E', 'Easting (X)'),
    NORTHING : new WellHeader('Northing (Y)', 'N', 'Northing (y)'),
    KB : new WellHeader('KB elevation', 'KB', 'KB Elevation'),
    GL : new WellHeader('GL elevation', 'GL', 'GL Elevation'),
    TD : new WellHeader('Total depth', 'TD', ''),
    ID : new WellHeader('Id', 'ID', 'ID'),
    NAME : new WellHeader('Name', 'NAME', 'Name'),
    COMPANY : new WellHeader('Company', 'COMP', 'Company'),
    OPERATOR : new WellHeader('Operator', 'OPERATOR', 'Operator'),
    AUTHOR : new WellHeader('Author', 'AUTHOR', 'Author'),
    DATE : new WellHeader('Date', 'DATE', 'Date'),
    LOGDATE : new WellHeader('Logging date', 'LOGDATE', 'Logging Date'),
    SRVC : new WellHeader('Service company', 'SRVC', 'ServiceCompany'),
    GDAT : new WellHeader('GeoDatum', 'GDAT', 'GeoDatum'),
    LIC : new WellHeader('License number', 'LIC', 'License'),
    CNTY : new WellHeader('County', 'CNTY', 'County'),
    STATE : new WellHeader('State', 'STATE', 'State'),
    PROV : new WellHeader('Province', 'PROV', 'Province'),
    CTRY : new WellHeader('Country', 'CTRY', 'Country'),
    LOC : new WellHeader('Location', 'LOC', 'Location'),
    FLD : new WellHeader('Field', 'FLD', 'Field'),
    PROJ : new WellHeader('Project', 'PROJ', 'Project'),
    CODE : new WellHeader('Code', 'CODE', 'Code'),
    AREA : new WellHeader('Area', 'AREA', 'Area'),
    TYPE : new WellHeader('Type', 'TYPE', 'Type'),
    STATUS : new WellHeader('Status', 'STATUS', 'Status'),
    GEN1 : new WellHeader('Gen 01', 'GEN1', 'Gen1'),
    GEN2 : new WellHeader('Gen 02', 'GEN2', 'Gen2'),
    GEN3 : new WellHeader('Gen 03', 'GEN3', 'Gen3'),
    GEN4 : new WellHeader('Gen 04', 'GEN4', 'Gen4'),
    GEN5 : new WellHeader('Gen 05', 'GEN5', 'Gen5'),
    GEN6 : new WellHeader('Gen 06', 'GEN6', 'Gen6')
};