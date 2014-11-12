$(document).ready(function() {

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
			showChatRoom();
		} else {
			alert(data.error);
		}
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