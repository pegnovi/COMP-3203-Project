var http = require("http");
var path = require("path");
var url = require("url");
var fs = require('fs');
var io = require("socket.io");
 
 
var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"
};
 
//read and store all the necessary static files to be sent to the client
var contentData = {};
var dirPath = "./public";
var filenames = fs.readdirSync(dirPath);
console.log("!!!filenames!!!");
for(var i=0; i<filenames.length; i++) {
    console.log(filenames[i]);
    contentData["/"+filenames[i]] = fs.readFileSync(dirPath+"/"+filenames[i]); 
}

 
var server = http.createServer(function(request, response) {
     
    console.log(request.url);
     
    var extname = path.extname(request.url);
    var contentType = 'text/html';
    var pathname = url.parse(request.url).pathname;
    console.log("pathname = " + pathname);
    console.log("extname = " + extname);
    console.log("extname = " + extname.substring(1, extname.length));
     
    if(pathname != "/") { //give the other files
        extname = extname.substring(1, extname.length);
        if(extname == "ico") {
            return;
        }
        contentType = mimeTypes[extname];
         
        if(typeof contentData[pathname] != "undefined") {
            response.writeHeader(200, {"Content-Type": contentType});
            response.write(contentData[pathname]);
            response.end();
        }
    }
    else { //give the starting page
        response.writeHeader(200, {"Content-Type": contentType});
        response.write(contentData["/client.html"]);
        response.end();
    }
     
}).listen(8080);
 
 
     
 
     
//=====================
//===socket.io stuff===
//=====================
var socket = io.listen(server);
 
var hosts = {};
     
socket.on("connection", function(client) {
 
    console.log("client id = " + client.id);
    client.name = "Unknown";
    client.locked = true;
     
    client.on("createid", function() {
        if(client.room) {
            client.emit("createid", JSON.stringify({
                id: client.room,
            }));
            return;
        }
        client.room = "";

        var UUID = getUUID();
        while(hosts[UUID]) {
            UUID = getUUID();
        }

        client.room = UUID;
        hosts[UUID] = client;
        client.name = "Host";

        client.emit("createid", JSON.stringify({
            id: UUID,
        }));
    });

    client.on("setname", function(data) {
        data = JSON.parse(data);
        var result = false;
        var message = "";

        if(data.name.length < 3) {
            message = "Name must be at least 3 characters long.";
        } else {
            client.name = data.name;
            result = true;
            message = "Name is good."
        }

        client.emit("setname", JSON.stringify({
            result: result,
            error: message 
        }));
    });

    client.on("togglelock", function() {
        if(client.room) {
            if(client.locked) {
                client.locked = false;
            } else
                client.locked = true;

            client.emit("toggledlock");
        }
    });

    client.on("doesroomexist", function(data) {
        data = JSON.parse(data);
        socket.emit("doesroomexist", JSON.stringify({
            result: hosts[data.room] ? true : false,
        }));
    });

    client.on("disconnect", function() {
        if(client.room) {
            delete hosts[client.room];
        }
    });
});

function getUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}