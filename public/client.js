$(document).ready(function() {

	//============
	//===WEBRTC===
	//============
	channelOpen = false;
	//http://www.html5rocks.com/en/tutorials/webrtc/infrastructure/
	//http://www.html5rocks.com/en/tutorials/webrtc/basics/
	//https://www.webrtc-experiment.com/docs/how-to-use-rtcdatachannel.html#sctp-firefox
	//https://bitbucket.org/webrtc/codelab
	//https://www.webrtc-experiment.com/docs/how-to-use-rtcdatachannel.html
	
	var PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
	var SessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
	
	// The RTCIceCandidate object.
	var RTCIceCandidate = mozRTCIceCandidate;
	//console.log(PeerConnection);
	//console.log(SessionDescription);
	//console.log(RTCIceCandidate);
	
	
	//stores peerConnection and dataChannel
	var ConnectionObj = {
		create: function() {
			var self = Object.create(this);
			self.name = "";
			var configuration = {
			  'iceServers': [
				{'url': 'stun:stun3.l.google.com:19302'},
				{'url': 'stun:stun1.l.google.com:19302'}
				{'url': 'stun:stun2.l.google.com:19302'}
				{'url': 'stun:stun3.l.google.com:19302'}
				{'url': 'stun:stun4.l.google.com:19302'}
				{'url':'stun:stun01.sipphone.com'},
				{'url':'stun:stun.ekiga.net'},
				{'url':'stun:stun.fwdnet.net'},
				{'url':'stun:stun.ideasip.com'},
				{'url':'stun:stun.iptel.org'},
				{'url':'stun:stun.rixtelecom.se'},
				{'url':'stun:stun.schlund.de'},
				{'url':'stun:stun.l.google.com:19302'},
				{'url':'stun:stun1.l.google.com:19302'},
				{'url':'stun:stun2.l.google.com:19302'},
				{'url':'stun:stun3.l.google.com:19302'},
				{'url':'stun:stun4.l.google.com:19302'},
				{'url':'stun:stunserver.org'},
				{'url':'stun:stun.softjoys.com'},
				{'url':'stun:stun.voiparound.com'},
				{'url':'stun:stun.voipbuster.com'},
				{'url':'stun:stun.voipstunt.com'},
				{'url':'stun:stun.voxgratia.org'},
				{'url':'stun:stun.xten.com'},
				{
					url: 'turn:numb.viagenie.ca',
					credential: 'muazkh',
					username: 'webrtc@live.com'
				},
				{
					url: 'turn:192.158.29.39:3478?transport=udp',
					credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
					username: '28224511:1379330808'
				},
				{
					url: 'turn:192.158.29.39:3478?transport=tcp',
					credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
					username: '28224511:1379330808'
				}
			  ]
			};
			self.pc = new PeerConnection(configuration);
			self.pc.onicecandidate = function(event) {
				if(event.candidate) {
					console.log("Sending new ICE Candidate");
					console.log(event.candidate);
					socket.emit("iceCandidate", JSON.stringify({
						room: roomId,
						candidate: event.candidate
					}));
				}
			}
			self.pc.onnegotiationneeded = function () {
				console.log("ON NEGOTIATION NEEDED");
				sendOfferToGroupmates(gpsIDs);
			}
			self.dataChannel = null;
			
			self.pc.ondatachannel = function(event) {
				console.log("GOT A DATA CHANNEL!!!");
				self.dataChannel = event.channel;
				setChannelEvents(self.dataChannel);
			}
			
			return self;
		},
		
		makeOwnDataChannel : function() {
			this.dataChannel = this.pc.createDataChannel("dataChannel");
			setChannelEvents(this.dataChannel);
		},
		
		setDataChannel : function(channel) {
			this.dataChannel = channel
		}
	};
	conObjs = {}; //clientID : connectionObj
	ownName = "";
	
	//============
	//============
	//============

	console.log("connecting...");
	var socket = io.connect("goDrawi.jit.su:80");
	console.log("connected!!!");

	//Sketchpad initialization
	var canvas = document.getElementById('canvas');
	var padContext = canvas.getContext('2d');
	var sketchpad = new Sketchpad(padContext);
	var drawingInterval = null;

	$('#size-selector').on('change', function(){
		sketchpad.setWidth($('#size-selector').val());
	});

	$('#size-selector').on('keydown', function(){
	    sketchpad.setWidth($('#size-selector').val());
	});

	$('#color-selector').on('change', function(){
	    sketchpad.setColor($('#color-selector').val());
	});

	//-----------------------

	roomId = getRoomIdFromUrl();
	if(roomId) {
		showLoading();
		
		socket.emit("doesroomexist", JSON.stringify({
			room: roomId
		}));
		
	} else {
		showHome();
		socket.emit("createid");
	}

	socket.on("iceCandidateUpdate", function(data) {
		data = JSON.parse(data);
		console.log("ICE Candidate update");
		if(conObjs[data.peerID] != undefined) {
			console.log("client found");
			conObjs[data.peerID].pc.addIceCandidate(new RTCIceCandidate(data.iceCandidate));
		}
	});
	
	socket.on("createid", function(data) {
		data = JSON.parse(data);
		$("#input-room-id").val(data.id);
	});

	socket.on("setname", function(data) {
		data = JSON.parse(data);
		if(data.result) {
			ownName = $("#name-input").val();
			showChatRoom();
		} else {
			alert(data.error);
		}
	});

	gpsIDs = [];
	socket.on("roomExists", function(data) {
		console.log("Room Exists, Sending Offer to groupmates");
		data = JSON.parse(data);
		gpsIDs = data.groupmatesIDs;
		sendOfferToGroupmates(data.groupmatesIDs);
	});
	function createOfferSendingFunction(grpMtID) {
		return function(offer) {
				conObjs[grpMtID].pc.setLocalDescription(new SessionDescription(offer), 
				function() {
					//send the offer to a server to be forwarded to the friend you're calling
					socket.emit("signalOffer", JSON.stringify({
						targetID: grpMtID,
						clientOffer: offer
					}));
				}, error);
		};
	}
	function sendOfferToGroupmates(groupmatesIDs) {
		for(var i=0; i<groupmatesIDs.length; i++) {
			var grpMtID = groupmatesIDs[i];
			conObjs[grpMtID] = ConnectionObj.create();
			conObjs[grpMtID].makeOwnDataChannel();
			
			//prevent using variables that are from outer scope
			//http://conceptf1.blogspot.ca/2013/11/javascript-closures.html
			//http://javascriptissexy.com/understand-javascript-closures-with-ease/

			conObjs[grpMtID].pc.createOffer(createOfferSendingFunction(grpMtID), error);
			/*
			conObjs[grpMtID].pc.createOffer(function(offer) {
				conObjs[grpMtID].pc.setLocalDescription(new SessionDescription(offer), 
				function() {
					//send the offer to a server to be forwarded to the friend you're calling
					socket.emit("signalOffer", JSON.stringify({
						targetID: idGetter(),
						clientOffer: offer
					}));
				}, error);
			}, error);
			*/
		}
	}
	
	socket.on("roomDoesNotExist", function() {
		alert("The room does not exist!");
		showHome();
	});
	
	socket.on("doesroomexist", function(data) {
		data = JSON.parse(data);
		if(data.result) {
			showNameForm();
		}
		else {
			alert("The room does not exist!");
			showHome();
		}
	});
	
	socket.on("offerFromClient", function(data) {
		console.log("OFFER RECEIVED!!! SENDING ANSWER");
		data = JSON.parse(data);
		console.log(data.offer);
		
		console.log("from client " + data.offererID);
		
		conObjs[data.offererID] = ConnectionObj.create();
		
		//if(conObjs[data.offererID] != undefined) {
		conObjs[data.offererID].pc.setRemoteDescription(new SessionDescription(data.offer), function() {
			console.log("in setRemoteDescription");
			conObjs[data.offererID].pc.createAnswer(function(answer) {
				console.log("in createAnswer");
				conObjs[data.offererID].pc.setLocalDescription(new SessionDescription(answer), function() {
					console.log("in setLocalDescription");
					//https://github.com/ESTOS/strophe.jingle/issues/35
					//send the answer to a server to be forwarded back to the caller
					socket.emit("signalAnswer", JSON.stringify({
						clientName: ownName,
						clientAnswer: answer,
						targetID: data.offererID 
					}));
				}, error);
			}, error);
		}, error);
		//}
		
	});

	socket.on("answerToOffer", function(data) {
		console.log("ANSWER RECEIVED!!!");
		data = JSON.parse(data);	
		
		conObjs[data.answererID].pc.setRemoteDescription(new SessionDescription(data.answer), function() {}, error);
		conObjs[data.answererID].name = data.answererName;
		showNameForm();

	});
	
	$("#create-button").click(function() {
		var string = "?i=".concat($("#input-room-id").val());
		history.replaceState(null, "", string);
		showNameForm();
	});

	$("#name-button").click(function() {
		socket.emit("setname", JSON.stringify({
			name: $("#name-input").val(),
		}));
		
		console.log("channelOpen = " + channelOpen);
		if(channelOpen == true) {
			console.log("SENDING A NAME");
			sendToGroup("name", $("#name-input").val());
		}
	});
	
	var sendChatMessage = function() {
		var msg = $("#msg").val();
		$("#convo").append(ownName + ": " + msg + "\n");
		sendToGroup("chatMessage", msg);
		$("#msg").val("");
	};
	$("#send").click(function() {
		sendChatMessage();
	});
	
	$("#msg").keypress(function(e) {
		if(e.which == 13) {
			sendChatMessage();
		}
	});

	drawingInterval = setInterval(function() {
		var array = sketchpad.toArray();
		if(array.length > 0)
			sendToGroup("draw", array);
	},30);

	function getRoomIdFromUrl() {
		var url = document.URL,
			n = url.indexOf("?i="),
			m = url.indexOf("&");

		if(n > -1 && n + 3 < url.length) {
			return url.substring(n + 3);
		}
		else
			return null;
	}

	function resizeCanvas(canvas, container) {
		//canvas.style.width = "100%";
		//canvas.style.height = "100%";

		//canvas.width  = canvas.offsetWidth;
		//canvas.height = canvas.offsetHeight;
	}

	function showChatRoom() {
		hide();
		$("#chat-room").show();
		$("#navbar").show();
		resizeCanvas($("#canvas")[0], $("#canvas-div")[0]);
	}

	function showHome() {
		hide();
		$("#home").show();
	}

	function showNameForm() {
		hide();
		$("#name-form").show();
	}

	function showLoading() {
		hide();
		$("#loading").show();
	}

	function hide() {
		$("#name-form").hide();
		$("#home").hide();
		$("#chat-room").hide();
		$("#navbar").hide();
		$("#loading").hide();
	}

	function error(err) { console.log("ERROR OCCURRED!!!"); console.log(err); endCall(); }

	function setChannelEvents(channel) {
		console.log("!!!!!SETTING CHANNEL EVENTS!!!!!");
		channel.onmessage = function(event) {
			var data = JSON.parse(event.data);
			console.log("received command: " + data.command);
			console.log("received dataObj: ");
			console.log(data.dataObj);
			commandFunctions[data.command](this, data);
		};
		channel.onopen = function() {
			console.log("channel open");
			channelOpen = true;
		}
		channel.onclose = function() {
			console.log("channel close");
		}
	}
		
	function sendToGroup(theCommand, theData) {
		for(var id in conObjs) {
			//console.log(conObjs[id]);
			conObjs[id].dataChannel.send(JSON.stringify({
				command: theCommand,
				dataObj: theData
			}));
		}
	}
		
	function findConObj(dataChannel) {
		for(var id in conObjs) {
			if(conObjs[id].dataChannel == dataChannel) {
				return conObjs[id];
			}
		}
		return null;
	}
		
	var commandFunctions = {};
	commandFunctions["name"] = function(dataChannel, data) {
		var theConObj = findConObj(dataChannel);
		if(theConObj != null) {
			theConObj.name = data.dataObj;
			console.log("received name = " + theConObj.name);
		}
	};

	commandFunctions["chatMessage"] = function(dataChannel, data) {
		var theConObj = findConObj(dataChannel);
		if(theConObj != null) {
			$("#convo").append(theConObj.name + ": " + data.dataObj + "\n");
		}
	};

	commandFunctions["draw"] = function(dataChannel, data) {
		var theConObj = findConObj(dataChannel);
		if(theConObj != null) {
			sketchpad.drawFromArray(data.dataObj);
		}
	}

	/*
	commandFunctions[" <YOUR COMMAND> "] = function(dataChannel, data) {
		var theConObj = findConObj(dataChannel);
		if(theConObj != null) {
			//YOUR STUFF TO DO
			
			//
		}
	};
	*/
});