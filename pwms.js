var identifierGenerator = require('node-uuid');
var util = require('util');



var pwms = function() {


	var activeSessions = {}; 

	var extendClient = function(sessionIdentifier, client) {


		var service = activeSessions[sessionIdentifier].service;

		client.socket.on('mouse-down', function(mousedownevent) {

			service.emit('mouse-down', mousedownevent);
		});


		client.socket.on('mouse-click', function(mouseclickevent) {
			
			console.info('mouse click occured');
			service.emit('mouse-click', mouseclickevent);
		});

		return client; 
	}

	return { 

		createSession : function() { 

			//generate a unique guid to identify the session
			var sessionIdentifier = identifierGenerator.v1();

			//create a session object which has the necessary information 
			var session = {};
			session.latest  = 0; 
			session.identifier = sessionIdentifier;

			//cache the session with the identifier as a key
			activeSessions[sessionIdentifier] = session; 

			//return the identifier so that the requesting service can attach to it (and dispatch it)
			return sessionIdentifier; 

		},

		attachService : function(sessionIdentifier, service) { 

			//find the session and add the client 
			var session = activeSessions[sessionIdentifier];
			if(!session) {
				service.disconnect(); 
				return; 
			}
			session.service = service;
		}, 

		attachClient : function(sessionIdentifier, client) {

			//find the session tuple for that session identifier and add the client
			var session = activeSessions[sessionIdentifier];

			if (!session) {

				client.socket.disconnect();
				return; 
			}

			session.client = extendClient(sessionIdentifier, client); 

			//flash to update the client and service regarding the successful pairing
			session.service.emit('started', "Both parties have connected to your session");
			session.client.socket.emit('started', "Both parties have connected to your session");

		},

		detachSocket : function(socket) {


			//console.log(util.inspect(activeSessions, {depth : 1}));

			var detachedSession; 
			var uninformed; 

			//one of the sockets (either the host or the participant) has disconnected, inform the other and shut down the session
			for (sessionIdentifier in activeSessions) {

				var session = activeSessions[sessionIdentifier];

				//client is disconnecting...
				if (session.client && session.client.socket === socket) {

					detachedSession = session;

					//the service should be informed if it exists
					if (session.service) {

						uninformed = session.service;	
					}
				}
				//client is disconnecting...
				else if (session.service === socket) {

					detachedSession = session;

					if(session.client && session.client.socket) {

						uninformed = session.client.socket;

					}
				}
			}


			//if the session was found, remove it from the list
			if(detachedSession) {

				console.log('removing the session');

				delete activeSessions[detachedSession.identifier];
			}

			if(uninformed) {

				console.log(uninformed.id + ' is sent a disconnect');
				uninformed.disconnect();
			}



		},

		dispatchImage : function(sessionIdentifier, image, sequence) {

			var session = activeSessions[sessionIdentifier];

			if(!session) {

				return;
			}

			//ignore any images which arrive and are of a lower sequence number the we have already seen
			if(session.latest < sequence) {

				session.client.send({
					name: image.name, 
					path: image.path
				}); 

				session.latest = sequence; 
			}

			//return back the higher number so that we can inform the updating client what is the latest sequence
			return Math.max(session.latest, sequence);

		},
	}
};


module.exports = pwms; 

