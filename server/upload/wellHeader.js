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
    WELL: new WellHeader('WELL', 'WELL', 'WellName'),
    UWI: new WellHeader('UWI', 'UWI', 'Unique Well Identifier'),
    API: new WellHeader('API', 'API', 'API'),
    LATI: new WellHeader('Latitude', 'LATI', 'Latitude'),
    LONG: new WellHeader('Longtitude', 'LONG', 'Longtitude'),
    E: new WellHeader('Easting (X)', 'E', 'Easting (X)'),
    N: new WellHeader('Northing (Y)', 'N', 'Northing (y)'),
    KB: new WellHeader('KB elevation', 'KB', 'KB Elevation'),
    GL: new WellHeader('GL elevation', 'GL', 'GL Elevation'),
    ID: new WellHeader('Id', 'ID', 'ID'),
    NAME: new WellHeader('Name', 'NAME', 'Name'),
    COMP: new WellHeader('Company', 'COMP', 'Company'),
    OPERATOR: new WellHeader('Operator', 'OPERATOR', 'Operator'),
    AUTHOR: new WellHeader('Author', 'AUTHOR', 'Author'),
    DATE: new WellHeader('Date', 'DATE', 'Date'),
    LOGDATE: new WellHeader('Logging date', 'LOGDATE', 'Logging Date'),
    SRVC: new WellHeader('Service company', 'SRVC', 'ServiceCompany'),
    GDAT: new WellHeader('GeoDatum', 'GDAT', 'GeoDatum'),
    LIC: new WellHeader('License number', 'LIC', 'License'),
    CNTY: new WellHeader('County', 'CNTY', 'County'),
    STATE: new WellHeader('State', 'STATE', 'State'),
    PROV: new WellHeader('Province', 'PROV', 'Province'),
    CTRY: new WellHeader('Country', 'CTRY', 'Country'),
    LOC: new WellHeader('Location', 'LOC', 'Location'),
    FLD: new WellHeader('Field', 'FLD', 'Field'),
    PROJ: new WellHeader('Project', 'PROJ', 'Project'),
    CODE: new WellHeader('Code', 'CODE', 'Code'),
    AREA: new WellHeader('Area', 'AREA', 'Area'),
    TYPE: new WellHeader('Type', 'TYPE', 'Type'),
    STATUS: new WellHeader('Status', 'STATUS', 'Status'),
};