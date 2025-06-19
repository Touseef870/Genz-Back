import mongoose from "mongoose"

const MessageSchema = new mongoose.Schema({
    senderId: {
        type: String,
        required: true,
        index: true,
    },
    senderName: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        default: "",
    },
    messageType: {
        type: String,
        enum: ["text", "image", "video"],
        default: "text",
    },
    mediaUrl: {
        type: String,
        default: "",
    },
    cloudinaryPublicId: {
        type: String,
        default: "",
    },
    isRead: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true })

const ChatSchema = new mongoose.Schema({
    participants: [
        {
            userId: {
                type: String,
                required: true,
                index: true,
            },
            name: String,
            avatar: String,
        },
    ],
    messages: [MessageSchema],
    lastMessage: {
        content: String,
        timestamp: {
            type: Date,
            default: Date.now,
        },
        senderId: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
})


const chatModel =mongoose.models.Chat || mongoose.model("Chat", ChatSchema)

export default chatModel