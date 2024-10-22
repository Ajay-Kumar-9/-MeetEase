import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

//user connect to server
export const connectToSocket = (server) => {
  const io = new Server(server , {
    cors: {
        origin : "*",
        methods : ["GET" , "POST"],
        allowedHeaders : ["*"],
        credentials : true,
    }
  });

  //this event trigger whenever user connect with server
  io.on("connection", (socket) => {
    console.log("Something connected");
    //this event trigger whenever user join a call
    socket.on("join-call", (path) => {
      if (connections[path] === undefined) {
        connections[path] = [];
      }
      connections[path].push(socket.id);

      timeOnline[socket.id] = new Date();

      //loop to send message to all participant
      for (let i = 0; i < connections[path].length; i++) {
        io.to(connections[path][i]).emit(
          "user-joined",
          socket.id,
          connections[path]
        );
      }

      //this loop is used to receive  all message  whenever new user joined
      if (messages[path] !== undefined) {
        for (let i = 0; i < messages[path].length; i++) {
          io.to(socket.id).emit(
            "chat-message",
            messages[path][i]["data"],
            messages[path][i]["sender"]["socket-id-sender"]
          );
        }
      }
    });

    //this event is used to track the signal whenever user try to call another person

    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    //this event is used to store the message and checking room
    socket.on("chat-message", (data, sender) => {
      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }

          return [room, isFound];
        },
        [" ", false]
      );

      if (found === true) {
        if (messages[matchingRoom] === undefined) {
          messages[matchingRoom] = [];
        }

        //push the messages of room in message object
        messages[matchingRoom].push({
          sender: sender,
          data: data,
          "socket-id-sender": socket.id,
        });
        console.log("message", matchingRoom, ":", sender, data);

        connections[matchingRoom].forEach((elem) => {
          //send msg to all participant
          io.to(elem).emit("chat-message", data, sender, socket.id);
        });
      }
    });

    //this event fires whenever user disconnect from the server
    socket.on("disconnect", () => {
      let diffTime = Math.abs(timeOnline[socket.id] - new Date());

      let key;

      //make a deep copy of data using JSon parse & stringify
      for (const [k, v] of JSON.parse(
        JSON.stringify(Object.entries(connections))
      )) {
        //here we try to find the room that the user left and store room name in key var
        for (let i = 0; i < v.length; i++) {
          if (v[i] === socket.id) {
            key = k;

            //noitfy all other participant that user left the room
            for (let i = 0; i < connections[key].length; i++) {
              io.to(connections[key][i]).emit("user-left", socket.id);
            }

            //find the user that left the room
            let index = connections[key].indexOf(socket.id);

            //remove that user from room
            connections[key].splice(index, 1);

            //check if room is empty if yes then remove the room from connections object
            if (connections[key].length === 0) {
              delete connections[key];
            }
          }
        }
      }
    });
  });
  return io;
};
