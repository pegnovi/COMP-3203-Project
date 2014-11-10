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
 
 
//Represents a group of clients in the same chatroom
var group = {
    create: function(groupName) {
        var self = Object.create(this);
        self.groupID = groupName;
        self.clients = {}; //{clientID (string) : {name (string), client (object)}}
        return self;
    },
    numMembers: function() {
        var count = 0;
        for(var key in this.clients) {
            count += 1;
        }
        return count;
    }
};
 
var groups = {};
groups["40"] = group.create("40");
groups["bla"] = group.create("bla");
 
//group helper functions
var genAvailableGroups = function(groups) {
    var availableGroups = {};
    var i = 0;
    for(var key in groups) {
        availableGroups[i] = key;
        i++;
    }
    return availableGroups;
};
 
var findClientGroup = function(groups, clientID) {
    for(var key in groups) {
        if(typeof groups[key].clients[clientID] != "undefined") {
            return groups[key];
        }
    }
    return null;
};
 
var findAndRemoveClientFromGroup = function(groups, clientID) {
    daGroup = findClientGroup(groups, clientID);
    if(daGroup != null) {
        delete daGroup.clients[clientID];
    }
};
 
 
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
 
var people = {};
     
socket.on("connection", function(client) {
 
    console.log("client id = " + client.id);
     
    socket.sockets.emit("availableGroupsUpdate", genAvailableGroups(groups));
     
    //=====join event
    //when the client joins
    client.on("join", function(regForm) {
        console.log(regForm.name + " has joined!!!");
        console.log("client id = " + client.id);
        people[client.id] = regForm.name;
         
        //create a new group if the chosenGroup ID doesn't exist
        if(typeof groups[regForm.chosenGroup] == "undefined") {
            console.log("Creating new group");
            groups[regForm.chosenGroup] = group.create(regForm.chosenGroup);
        }
        //add the client to the group
        groups[regForm.chosenGroup].clients[client.id] = {};
        groups[regForm.chosenGroup].clients[client.id].name = regForm.name;
        groups[regForm.chosenGroup].clients[client.id].daClient = client;
         
        client.emit("update-groupID", regForm.chosenGroup);
         
        //update everyone in the group that this client has joined
        var daGroup = findClientGroup(groups, client.id);
        for(var key in daGroup.clients) {
            if(key == client.id) {
                daGroup.clients[key].daClient.emit("update", "You have connected to the server.");
            }
            else {
                daGroup.clients[key].daClient.emit("update", regForm.name + " has joined the server.");
            }
            daGroup.clients[key].daClient.emit("update-people", people);
        }
         
        console.log("Groups");
        console.log(groups);
        //for(var key in groups) { console.log(groups[key].clients); }
         
    });
         
    //=====send event
    //when the client sends something
    client.on("send", function(msg) {
        console.log(people[client.id] + " sent something!!!");
        console.log("client id = " + client.id);
        console.log("message = " + msg);
         
        //send only to members of a group
        //socket.sockets.emit("chat", people[client.id], msg);
        var daGroup = findClientGroup(groups, client.id);
        for(var key in daGroup.clients) {
            console.log(daGroup.clients[key].name);
            daGroup.clients[key].daClient.emit("chat", daGroup.clients[client.id].name, msg);
        }
    });
	
	//=====drawing send event
	//when the client sends drawing info
	client.on("drawingupdate", function(data) {
		var daGroup = findClientGroup(groups, client.id);
		for(var key in daGroup.clients) {
			if(daGroup.clients[key].id != client.id) {
				daGroup.clients[key].daClient.emit("drawingupdate", data);
			}
		}
	});
     
    //=====disconnect
    //when the client disconnects
    client.on("disconnect", function() {
        console.log(people[client.id] + " has left!!!");
        console.log("client id = " + client.id);
         
        //update all people in the same group that this client has left
        //socket.sockets.emit("update", people[client.id] + " has left the server.");
        delete people[client.id];
        var daGroup = findClientGroup(groups, client.id);
        if(daGroup != null) {
            for(var key in daGroup.clients) {
                if(key != client.id) {
                    daGroup.clients[key].daClient.emit("update", daGroup.clients[client.id].name + " has left the server.");
                    daGroup.clients[key].daClient.emit("update-people", people);
                }
            }
         
            findAndRemoveClientFromGroup(groups, client.id);
             
            console.log("num members = " + daGroup.numMembers());
            if(daGroup.numMembers() <= 0) {
                console.log("deleting a group");
                delete groups[daGroup.groupID];
                socket.sockets.emit("availableGroupsUpdate", genAvailableGroups(groups));
            }
        }
         
    });
     
});