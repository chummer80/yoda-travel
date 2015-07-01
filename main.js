var http = require('http');
var server = http.createServer(function(request, response) {
	console.log('Got a request...');
	response.write('Thank you for your request.');
	response.end();
});

server.listen(3000, function() {
	console.log('Listening on port ' + server.address().port);
});


var watson = require('watson-developer-cloud');
 
var question_and_answer_healthcare = watson.question_and_answer({
  username: 'mike.c.chu@gmail.com',
  password: 'asdfasdf',
  version: 'v1',
  dataset: 'healthcare' /* The dataset can be specified when creating
                         * the service or when calling it */
});
 
question_and_answer_healthcare.ask({
  text: 'What is HIV?'}, function (err, response) {
    if (err)
      console.log('error:', err);
    else
      console.log(JSON.stringify(response, null, 2));
});