/*jshint node:true*/

// app.js
// This file contains the server side JavaScript code for your application.
// This sample application uses express as web application framework (http://expressjs.com/),
// and jade as template engine (http://jade-lang.com/).

var express = require('express');
var https = require('https');
var url = require('url');
var extend = require('util')._extend;

// setup middleware
var app = express();
app.use(express.errorHandler());
app.use(express.urlencoded()); // to support URL-encoded bodies
app.use(app.router);

app.use(express.static(__dirname + '/public')); //setup static public directory
app.set('view engine', 'jade');
app.set('views', __dirname + '/views'); //optional since express defaults to CWD/views

// There are many useful environment variables available in process.env.
// VCAP_APPLICATION contains useful information about a deployed application.
var appInfo = JSON.parse(process.env.VCAP_APPLICATION || "{}");
// TODO: Get application information and use it in your app.

// defaults for dev outside bluemix
var service_url = 'https://gateway.watsonplatform.net/question-and-answer-beta/api';
var service_username = '00c6d0b6-e234-46c1-a2ff-1b929ec2f132';
var service_password = 'rgOzjNQEv3vW';

// VCAP_SERVICES contains all the credentials of services bound to
// this application. For details of its content, please refer to
// the document or sample of each service.
if (process.env.VCAP_SERVICES) {
  console.log('Parsing VCAP_SERVICES');
  var services = JSON.parse(process.env.VCAP_SERVICES);
  //service name, check the VCAP_SERVICES in bluemix to get the name of the services you have
  var service_name = 'question_and_answer';

  if (services[service_name]) {
    var svc = services[service_name][0].credentials;
    service_url = svc.url;
    service_username = svc.username;
    service_password = svc.password;
  } else {
    console.log('The service '+service_name+' is not in the VCAP_SERVICES, did you forget to bind it?');
  }

} else {
  console.log('No VCAP_SERVICES found in ENV, using defaults for local development');
}

console.log('service_url = ' + service_url);
console.log('service_username = ' + service_username);
console.log('service_password = ' + new Array(service_password.length).join("X"));

var auth = "Basic " + new Buffer(service_username + ":" + service_password).toString("base64");

// render index page
app.get('/', function(req, res){
    res.render('index');
});

// Handle the form POST containing the question to ask Watson and reply with the answer
app.post('/', function(req, res){
  var parts = url.parse(service_url +'/v1/question/travel');
  var options = {
    host: parts.hostname,
    port: parts.port,
    path: parts.pathname,
    method: 'POST',
    headers: {
      'Content-Type'  :'application/json',
      'Accept':'application/json',
      'X-synctimeout' : '30',
      'Authorization' :  auth
    }
  };

  // Create a request to POST to Watson
  var watson_req = https.request(options, function(result) {
    result.setEncoding('utf-8');
    var response_string = '';

    result.on('data', function(chunk) {
      response_string += chunk;
    });

    result.on('end', function() {
      var answers = JSON.parse(response_string)[0];

      var escapedText = escape(answers.question.evidencelist[0].text);
      var yodaOptions = {
        hostname: 'yoda.p.mashape.com',
        path: '/yoda?sentence=' + escapedText,
        method: 'GET', 
        headers: {
          'Content-Type'  :'application/json',
          'X-Mashape-Key': 'RdVcfQ4XRHmshpx3q654uMVp8yIOp1LZfGhjsnvqOzQLgboIlp'
        }
      };
      var yodaReq = https.request(yodaOptions, function(yodaResult) {
        yodaResult.setEncoding('utf-8');
        var yodaResponseString = '';

        yodaResult.on('data', function(chunk) {
          yodaResponseString += chunk;
        });

        yodaResult.on('end', function() {
          answers.question.evidencelist[0].text = yodaResponseString;

          var response = extend({ 'answers': answers },req.body);
          return res.render('index', response);
        });
      });
      yodaReq.on('error', function(e) {
        return res.render('index', {'error': "Yoda is sleeping: " + e.message});
      });
      
      yodaReq.end();
    });
  });

  watson_req.on('error', function(e) {
    return res.render('index', {'error': e.message});
  });

  // create the question to Watson
  var questionData = {
    'question': {
      'evidenceRequest': {
        'items': 1 // the number of anwers
      },
      'items': 1,
      'questionText': req.body.questionText // the question
    }
  };

  // Set the POST body and send to Watson
  watson_req.write(JSON.stringify(questionData));
  // debugger;
  watson_req.end();

});

// The IP address of the Cloud Foundry DEA (Droplet Execution Agent) that hosts this application:
var host = (process.env.VCAP_APP_HOST || 'localhost');
// The port on the DEA for communication with the application:
var port = (process.env.VCAP_APP_PORT || 3000);
// Start server
app.listen(port, host);