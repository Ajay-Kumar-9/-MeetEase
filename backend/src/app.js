import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import { connectToSocket } from "./Controllers/socketManager.js";
import userRoutes from "./Routes/user.routes.js";

const app = express();

const server = createServer(app);
const io = connectToSocket(server);

app.set("port", process.env.PORT || 8000);

app.use(cors());
app.use(express.json({limit : "40kb"}));
app.use(express.urlencoded({limit : "40kb", extended: true}));

app.use("/api/v1/users", userRoutes);
const start = async () => {
  app.set("mongo_user");
  const connectionDb = await mongoose.connect("mongodb+srv://sigmaStudent:clonezoom@zoom-clone.dskdl.mongodb.net/zoomClone?retryWrites=true&w=majority&appName=Zoom-clone");
  console.log(`DB connected  ${connectionDb.connection.host}`);
  server.listen(app.get("port"), () => {
    console.log("SERVER IS LISTENING ON PORT 8000");
  });
}

start();
