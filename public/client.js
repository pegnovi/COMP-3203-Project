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
	/*
	// The RTCIceCandidate object.
	var RTCIceCandidate = mozRTCIceCandidate;
	console.log(PeerConnection);
	console.log(SessionDescription);
	console.log(RTCIceCandidate);
	*/
	
	//stores peerConnection and dataChannel
	var ConnectionObj = {
		create: function() {
			var self = Object.create(this);
			self.name = "";
			self.pc = new PeerConnection();
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
	var groupRoomID = "";
	
	//============
	//============
	//============

	console.log("connecting...");
	var socket = io.connect("127.0.0.1:8080");
	console.log("connected!!!");

	//Sketchpad initialization
	var canvas = document.getElementById('sketchpad');
	var padContext = canvas.getContext('2d');
	var sketchpad = new Sketchpad(padContext);
	var drawingInterval = null;

	var roomId = getRoomIdFromUrl();
	if(roomId) {
		showLoading();
		
		socket.emit("doesroomexist", JSON.stringify({
			room: roomId
		}));
		
	} else {
		showHome();
		socket.emit("createid");
	}

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

	socket.on("roomExists", function(data) {
		console.log("Room Exists, Sending Offer to groupmates");
		data = JSON.parse(data);
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
		
		socket.emit("answerConfirmed", JSON.stringify({
			roomID: data.roomID
		}));

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
});

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
	var aspect = canvas.width/canvas.height,
	width = container.width(),
	height = container.height();

	canvas.width = Math.round(width * aspect);
	canvas.height = height;
}

function showChatRoom() {
	hide();
	$("#chat-room").show();
	$("#navbar").show();
	resizeCanvas($("#sketchpad")[0], $("#canvas-div")[0]);
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

/*
commandFunctions[" <YOUR COMMAND> "] = function(dataChannel, data) {
	var theConObj = findConObj(dataChannel);
	if(theConObj != null) {
		//YOUR STUFF TO DO
		
		//
	}
};
*/