import mongoose from "mongoose"

const UserSchema = new mongoose.Schema(
    {
        firebaseUid: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        avatar: {
            type: String,
            default: "",
        },
        isOnline: {
            type: Boolean,
            default: false,
            index: true,
        },
        lastSeen: {
            type: Date,
            default: Date.now,
        },
        socketId: {
            type: String,
            default: "",
            index: true,
        },
    },
    {
        timestamps: true,
    },
)

// Indexes for better performance
UserSchema.index({ firebaseUid: 1, isOnline: 1 })
// UserSchema.index({ socketId: 1 })

const userModel = mongoose.models.User || mongoose.model("User", UserSchema)
export default userModel