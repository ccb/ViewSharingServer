var express = require('express'); 
var app = express(); 
var server = require('http').createServer(app); 
var io = require('socket.io').listen(server); 
var dl = require('delivery'); 

var pwms = require('./pwms')();


var util = require('util');

var last = new Date().getTime(); 

var updateFPS = function() {

	var now = new Date().getTime(); 
	var diff = (now - last)/1000; 

	console.info ("FPS : " + 1/diff);

	last = now; 
}
//start up the server using express 
var port = process.env.PORT || 3000;
server.listen(port); 

//set the log level for socket io so it doesn't spam like crazy
io.configure('development', function(){

	io.set('log level', 1); 

}); 

//ask express to server out the client html from the static directory
app.use(express.bodyParser()); 
app.use(express.static(__dirname + '/static')); 


app.get('/client/', function(req, res) {

	res.sendfile(__dirname + '/static/client.html');

}); 

//setup the route to handle a request to create a session
app.post('/session', function(req, res) {

	var sessionIdentifier = pwms.createSession();

	res.json({'sessionIdentifier': sessionIdentifier});
	res.send(200); // ??? should this be a different code? 
});

//setup the route to handle image dispatching
app.post('/session/:sessionIdentifier/screen/:sequence', function(req, res) {

	var sessionIdentifier = req.params.sessionIdentifier; 
	var image = req.files.image;
	var sequence = parseInt(req.params.sequence);

	//update pwms with the latest arrive image
	var latestSequence = pwms.dispatchImage(sessionIdentifier, image, sequence);

	//return to the requestor
	res.json({receivedSequence: latestSequence});
	res.send(200);
}); 


//setup the socket event handlers to deal with attaching client and service
io.sockets.on('connection', function(socket) {

	console.info("a socket connected");

	socket.on('attach-service', function(sessionIdentifier, callback) { 

		console.log(socket.id + ' attached as service');
		pwms.attachService(sessionIdentifier, socket);

		callback(); 

	});

	socket.on('attach-client', function(sessionIdentifier, callback) {

		
		var delivery = dl.listen(socket); 

		callback(); 



		delivery.on('delivery.connect', function(delivery) { 

			console.log(socket.id + ' attached as client');
			pwms.attachClient(sessionIdentifier, delivery); 
		}); 

	});

	//one of the two sockets has disconnected, remove the entire session
	socket.on('disconnect', function() {

		console.log(socket.id + 'disconnected');
		pwms.detachSocket(socket);

	}); 
});

io.sockets.on('disconnection', function(socket) {

	console.log('disonnected');

});

console.info("PWMS Server Running on Port: " + port);

