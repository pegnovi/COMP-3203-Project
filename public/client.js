$(document).ready(function() {

	//============
	//===WEBRTC===
	//============
	//http://www.html5rocks.com/en/tutorials/webrtc/infrastructure/
	//http://www.html5rocks.com/en/tutorials/webrtc/basics/
	//https://www.webrtc-experiment.com/docs/how-to-use-rtcdatachannel.html#sctp-firefox
	//https://bitbucket.org/webrtc/codelab
	
	var PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
	var SessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
	/*
	var GET_USER_MEDIA = navigator.getUserMedia ? "getUserMedia" :
                     navigator.mozGetUserMedia ? "mozGetUserMedia" :
                     navigator.webkitGetUserMedia ? "webkitGetUserMedia" : "getUserMedia";
	//var v = document.createElement("video");
	/*var SRC_OBJECT = 'srcObject' in v ? "srcObject" :
					'mozSrcObject' in v ? "mozSrcObject" :
					'webkitSrcObject' in v ? "webkitSrcObject" : "srcObject";
	*/
	/*
	// The RTCIceCandidate object.
	var RTCIceCandidate = mozRTCIceCandidate;
	console.log(PeerConnection);
	console.log(SessionDescription);
	console.log(RTCIceCandidate);
	*/
	
	var pc = new PeerConnection();
	// Establish your peer connection using your signaling channel here
	var dataChannel = pc.createDataChannel("dataChannel");
	dataChannel.onmessage = function(event) {
		console.log("received: " + event.data);
	};
	dataChannel.onopen = function() {
		console.log("datachannel open");
		dataChannel.send("HELLO, I SENT SOMETHING");
	}
	dataChannel.onclose = function() {
		console.log("datachannel close");
	}

	/*
	peerConnection.createOffer(
		function(sessionDesc) {
			peerConnection.setLocalDescription(sessionDesc);
			console.log("Sending: SDP");
			console.log(sessionDesc);
			//socket.emit("???", sessionDesc);
		},
		function onCreateSessionDescriptionError(error) {
			console.log('Failed to create session description: ' + error.toString());
		}
	);
	*/
	
	console.log(pc);
	console.log(dataChannel);
	
	console.log("WEBRTC DONE FOR NOW");
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
		
		pc.createOffer(function(offer) {
			pc.setLocalDescription(new SessionDescription(offer), function() {
				//send the offer to a server to be forwarded to the friend you're calling
				socket.emit("doesroomexist", JSON.stringify({
					room: roomId,
					clientOffer: offer
				}));
			}, error);
		}, error);
		
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
			showChatRoom();
		} else {
			alert(data.error);
		}
	});

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
		data = JSON.parse(data);
		console.log(data.offer);
		console.log("OFFER RECEIVED!!!");
		
		pc.setRemoteDescription(new SessionDescription(data.offer), function() {
			pc.createAnswer(function(answer) {
				pc.setLocalDescription(new SessionDescription(answer), function() {
					//send the answer to a server to be forwarded back to the caller
					socket.emit("sendAnswer", JSON.stringify({
						hostClientAnswer: answer,
						targetClient: data.theClientID 
					}));
				}, error);
			}, error);
		}, error);
		
	});

	socket.on("hostAnswer", function(data) {
		data = JSON.parse(data);
		console.log("ANSWER RECEIVED!!!");
		
		pc.setRemoteDescription(new SessionDescription(data.hostAnswer), function() {}, error);
		showNameForm();
		//dataChannel.send("HELLO, I SENT SOMETHING");
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

function error(err) { console.log("ERROR OCCURRED!!!"); endCall(); }