const mongoose = require('mongoose');
const {ObjectId} = mongoose.Schema; 

const requestTradeSchema = new mongoose.Schema({
    sender:{
        required:true,
        type: ObjectId,
        ref: 'Trainer'
    },
    receiver:{
        required:true,
        type: ObjectId,
        ref: 'Trainer'
    },
    pokemonSender:{
        required:false,
        type:ObjectId,
        ref:'Pokemon'
    },
    itemSender:{
        required:false,
        type:ObjectId,
        ref:'Item'
    },
    pokemonReceiver:{
        required:false,
        type:ObjectId,
        ref:'Pokemon'
    },
    itemReceiver:{
        required:false,
        type:ObjectId,
        ref:'Item'
    },

})
module.exports = mongoose.model('requestTrade', requestTradeSchema)