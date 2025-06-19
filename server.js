import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userModel from "./model/UserModel.js";
import chatModel from "./model/ChatModel.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS setup
app.use(cors());

mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on("connected", () => {
    console.log("✅ MongoDB connected");
});

// Serve a simple test route
app.get("/", (req, res) => {
    // res.send("Socket.IO backend running...");
    res.status(200).json({ 
        message: "Socket.IO backend running successfully, ✅ MongoDB connected",
        status: "success"
     })
});

// Socket.io server
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// When a client connects
io.on("connection", (socket) => {
    console.log("🔌 A user connected:", socket.id);

    // Join event - handle user joining the chat system
    socket.on("join", async (userId) => {
        try {
            console.log(`👤 User joined: ${userId}`);

            // Join user's personal room
            socket.join(userId);

            // Update user status in database
            const user = await userModel.findOneAndUpdate(
                { firebaseUid: userId },
                {
                    isOnline: true,
                    socketId: socket.id,
                    lastSeen: new Date(),
                },
                { new: true, upsert: true }
            );

            // Notify others this user is online
            socket.broadcast.emit("user-online", userId);

            // Get user's active chats and join those rooms
            const userChats = await chatModel.find({
                participants: { $elemMatch: { userId } }
            });

            userChats.forEach(chat => {
                socket.join(chat._id.toString());
                console.log(`User ${userId} joined chat ${chat._id}`);
            });

            console.log(`✅ User ${userId} joined successfully`);
            socket.emit("joined", { success: true, userId });
        } catch (err) {
            console.error("❌ Error in join handler:", err);
            socket.emit("join-error", { error: "Failed to join chat" });
        }
    });

    // Handle joining a specific chat room
    socket.on("join-chat", async (chatId) => {
        try {
            socket.join(chatId);
            console.log(`✅ User joined chat room: ${chatId}`);
            socket.emit("joined-chat", { chatId });
        } catch (err) {
            console.error("❌ Error joining chat:", err);
        }
    });

    // Message event
    // Handle messages
    socket.on("send-message", async (data) => {
        // console.log(`📩 New message in chat ${data.chatId} from ${data.senderId}: ${data.content}`);
        // console.log("Message data:", data);
        try {
            // Save to database
            const chat = await chatModel.findByIdAndUpdate(
                data.chatId,
                {
                    $push: { messages: data },
                    $set: {
                        lastMessage: {
                            content: data.content,
                            timestamp: new Date(),
                            senderId: data.senderId
                        },
                        updatedAt: new Date()
                    }
                },
                { new: true }
            );

            // Emit to all in the chat room
            io.to(data.chatId).emit("receive-message", {
                ...data,
                _id: chat.messages[chat.messages.length - 1]._id,
                timestamp: new Date()
            });

            // Notify participants for sidebar updates
            chat.participants.forEach(participant => {
                io.to(participant.userId).emit("chat-updated", {
                    chatId: chat._id,
                    lastMessage: chat.lastMessage,
                    updatedAt: chat.updatedAt
                });
            });
        } catch (error) {
            console.error("Message error:", error);
        }
    });

    // Typing indicator
    // socket.on("typing", (data) => {
    //     try {
    //         console.log(`⌨️ Typing event in chat ${data.chatId} by ${data.userId}`);
    //         socket.to(data.chatId).emit("user-typing", {
    //             userId: data.userId,
    //             isTyping: data.isTyping,
    //             chatId: data.chatId
    //         });
    //     } catch (err) {
    //         console.error("❌ Error handling typing event:", err);
    //     }
    // });

    // Message read receipt
    socket.on("mark-read", async (data) => {
        try {
            const { chatId, userId, messageId } = data;
            const chat = await chatModel.findById(chatId);

            if (chat) {
                const message = chat.messages.id(messageId);
                if (message && !message.readBy.includes(userId)) {
                    message.readBy.push(userId);
                    await chat.save();

                    // Notify sender that message was read
                    io.to(message.senderId).emit("message-read", {
                        chatId,
                        messageId,
                        readBy: userId,
                        readAt: new Date()
                    });
                }
            }
        } catch (err) {
            console.error("❌ Error marking message as read:", err);
        }
    });

    // Disconnect handler
    socket.on("disconnect", async () => {
        try {
            console.log("❌ User disconnected:", socket.id);
            const user = await userModel.findOneAndUpdate(
                { socketId: socket.id },
                {
                    isOnline: false,
                    lastSeen: new Date(),
                    socketId: "",
                },
                { new: true }
            );

            if (user) {
                io.emit("user-offline", user.firebaseUid);
                console.log(`📴 User ${user.firebaseUid} marked offline`);
            }
        } catch (err) {
            console.error("❌ Error handling disconnect:", err);
        }
    });

    // Error handling
    socket.on("error", (error) => {
        console.error("🔥 Socket error:", error);
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});


export default app; // Export the app for testing or further use
export { io };
