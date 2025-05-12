import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema({
    email:{
        type: String,
        required: true,
        unique: true,
        minlength: 3
    },
    
    username:{
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: 3
    },
    password:{
        type: String,
        required: true,
        minlength: 6
    },
}, {timestamps: true});

const User = mongoose.model('User', userSchema);

export default User;