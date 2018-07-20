var request = require("request");

var options = { method: 'POST',
  url: 'http://localhost:3000/user/well/findbyname',
  headers: 
   { 'Cache-Control': 'no-cache',
     'Content-Type': 'application/json' },
  body: 
   { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImRvZHYiLCJwYXNzd29yZCI6ImM0Y2E0MjM4YTBiOTIzODIwZGNjNTA5YTZmNzU4NDliIiwid2hvYW1pIjoibWFpbi1zZXJ2aWNlIiwiaWF0IjoxNTE3MTkyODgyLCJleHAiOjE1MTczNjU2ODJ9.Pj04k68Uw8fkShrkU3n9Thlvq8f7D1aA8d0reS0xtYs',
     wellname: '02_97-DD-1X' },
  json: true };


request(options, function (error, response, body) {
  if (error) throw new Error(error);

  const idWell = body.content.idWell;
  var editHeaderOptions = { method: 'POST',
  url: 'http://localhost:3000/user/well/editHeader',
  headers: 
   {'Cache-Control': 'no-cache',
     'Content-Type': 'application/json' },
  body: 
   { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImRvZHYiLCJwYXNzd29yZCI6ImM0Y2E0MjM4YTBiOTIzODIwZGNjNTA5YTZmNzU4NDliIiwid2hvYW1pIjoibWFpbi1zZXJ2aWNlIiwiaWF0IjoxNTE3MTkyODgyLCJleHAiOjE1MTczNjU2ODJ9.Pj04k68Uw8fkShrkU3n9Thlvq8f7D1aA8d0reS0xtYs',
     idWell: idWell,
     header: 'APDAT',
     value: 'header has been changed' },
  json: true };

  request(editHeaderOptions, function (error, response, body) {
    console.log("===========> ");
    if (error) throw new Error(error);

    console.log(JSON.stringify(body));
  });
});
