const mongoose = require('mongoose');
const trainer = require("./Trainer")
const {ObjectId} = mongoose.Schema; 

const requestFriendshipSchema = new mongoose.Schema({
    sender:{
        required:true,
        type: ObjectId,
        ref: 'Trainer'
    },
    receiver:{
        required:true,
        type: ObjectId,
        ref: 'Trainer'
    }
})
module.exports = mongoose.model('requestFriendship', requestFriendshipSchema)