
var socket; 
var delivery; 

function applicationStart() {

	var rawurl = purl(); 

	var sessionIdentifier = rawurl.attr('query').split("=")[1];

	var hosturl = rawurl.attr('host') + ":" + rawurl.attr('port'); 


	socket = io.connect(hosturl); 
	socket.on('connect', function() { 

		socket.emit('attach-client',sessionIdentifier,  function() {

			delivery = new Delivery(socket); 

			delivery.on('receive.success', function(file) { 

				document.getElementById('screen').src = file.dataURL(); 


			}); 
		});
	}); 


	socket.on('flash', function(message) {

		console.info("socket: " + message); 
	});



	socket.on('disconnect', function(message) {

		alert('your session was disconnected');
		document.getElementById('screen').src = ""; 

		//socket.disconnect();

		delete socket;
		delete delivery; 

	});


}



function mouseMove(event) {

	var element = document.getElementById('screen');

	var xOffset = element.x; 
	var yOffset = element.y; 

	var xPercentage = (event.x - xOffset) / element.width;
	var yPercentage = (event.y - yOffset) / element.height;

	if (delivery) {



		delivery.socket.emit("mouse-down", { X: xPercentage, Y: yPercentage}); 
	}
}

