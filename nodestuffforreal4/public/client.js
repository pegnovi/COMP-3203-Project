$(document).ready(function() {
	//WEBRTC
	var RTCPeerConnection = mozRTCPeerConnection;
	var RTCIceCandidate = mozRTCIceCandidate;
	var RTCSessionDescription = mozRTCSessionDescription;
	
	function SignalingChannel(peerConnection) {
		//Setup the signaling channel so that 2 clients can talk
		this.peerConnection = peerConnection;
	}
	SignalingChannel.prototype.send = function(message) {
		var data = JSON.stringify(message);
		//Send message using your favorite real-time network
	};
	SignalingChannel.prototype.onmessage = function(message) {
		var data = JSON.parse(message);
		
		//If we get a sdp we have to sign and return it
		if(message.sdp != null) {
			var that = this;
			this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp), function() {
				
				that.peerConnection.createAnswer(function(description) {
					that.send(description);
				});
			});
		}
		else {
			this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
		}
	};
	//======


	console.log("connecting...");
	
	var socket = io.connect("127.0.0.1:8080");
	
	console.log("connected!!!");
	
	//Sketchpad initialization
	var padContext = document.getElementById('sketchpad').getContext('2d');
	var sketchpad = new Sketchpad(padContext);
	var drawingInterval = null;
	
	$("#newGroupName").hide();
	$("#chat").hide();
	$("#sketchpad").hide();
	$("#name").focus();
	$("form").submit(function(event) {
		event.preventDefault();
	});
	
	//--------------------------------------------
	//---html page event listeners and handlers---
	//--------------------------------------------
	var processJoin = function() {
		if($("#availableGroups").val == "") {
			alert("No group selected!");
			return;
		}
		var regForm = {};
		regForm.name = $("#name").val();
		
		if($("#availableGroups").val() == "new") {
			if($("#newGroupName").val() == "") {
				alert("No Group name specified!!!");
				return;
			}
			else {
				regForm.chosenGroup = $("#newGroupName").val();
			}
		}
		else {
			regForm.chosenGroup = $("#availableGroups").val();
		}
		
		console.log("name = " + regForm.name);
		console.log("chosen group = " + regForm.chosenGroup);
		
		if(regForm.name != "") {
			console.log("Joining...");
			socket.emit("join", regForm);
			$("#login").detach();
			$("#chooseGroup").detach();
			$("#groupID").show();
			$("#chat").show();
			$("#sketchpad").show();
			$("#msg").focus();
			$("#msg").removeAttr('disabled');
			$("#send").removeAttr('disabled');
			ready = true;

			drawingInterval = setInterval(function() {
				sendDrawing();
			}, 100);			
		}
	};
	$("#join").click(processJoin);
	$("#name").keypress(function(e) {
		if(e.which == 13) { //enter key == 13
			processJoin();
		}
	});
	
	
	var sendMessage = function() {
		var msg = $("#msg").val();
		socket.emit("send", msg);
		$("#msg").val("");
	};
	$("#send").click(function() {
		sendMessage();
	});
	
	$("#msg").keypress(function(e) {
		if(e.which == 13) {
			sendMessage();
		}
	});
	
	//Send Drawing Info
	var sendDrawing = function() {
		var array = sketchpad.toArray();
		console.log(array.length);
		
		if(array.length > 0) {
			var data = {
				drawing: array,
			}
			socket.emit("drawingupdate", JSON.stringify(data));
		}
	}
	
	socket.on("drawingupdate", function(data) {
		sketchpad.drawFromArray(JSON.parse(data).drawing);
	});
	
	
	$("#availableGroups").on("change", function(e) {
		console.log("changed and val = " + this.value);
		if(this.value == "new") {
			$("#newGroupName").show();
		}
		else {
			$("#newGroupName").val('');
			$("#newGroupName").hide();
		}
	});
	
	//+++++++++++++++++++++++++++++++++++++++++
	//+++socket event listeners and handlers+++
	//+++++++++++++++++++++++++++++++++++++++++
	socket.on("availableGroupsUpdate", function(data) {
		$("#availableGroups").find("option").remove();
		$.each(data, function(key, value) {
			$("#availableGroups").append($("<option></option>").attr("value",value).text(value));
		});
		$("#availableGroups").append($("<option></option>").attr("value","new").text("new"));
	});
	
	socket.on("update", function(msg) {
		if(ready) {
			//$("#msgs").append("" + msg + "");
			$("#convo").append("" + msg + "\n");
		}
	});
	
	socket.on("update-groupID", function(groupID) {
		if(ready) {
			$("#groupID").text("GROUP-ID: " + groupID);
		}
	});
	
	socket.on("update-people", function(people) {
		if(ready) {
			$("#people").empty();
			$.each(people, function(clientid, name) {
				$("#people").append("" + name + "");
			});
		}
	});
	
	socket.on("chat", function(who, msg) {
		if(ready) {
			//$("#msgs").append("" + who + " says: " + msg + "");
			$("#convo").append("" + who + ": " + msg + "\n");
		}
	});
	
	socket.on("disconnect", function() {
		$("#msgs").append("The server is not available");
		$("#msg").attr("disabled", "disabled");
		$("#send").attr("disabled", "disabled");
		clearInterval(drawingInterval);
	});
	
	
	
});