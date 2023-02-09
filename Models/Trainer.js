const mongoose = require('mongoose');
const {ObjectId} = mongoose.Schema; 

const trainerSchema = new mongoose.Schema({
    username: {
        required: true,
        unique: true,
        type: String
    },
    password: {
        required: true,
        minlength: 5,
        type: String
    },
    email: {
        required: true,
        unique: true,
        type: String
    },
    birthday: {
        required: false
    },
    region: {
        regionName:{
            required:true,
            type:String
        },
        route:{
            required:true,
            type:Number,
        },
        champion:{
            required:false,
            type:String
        }
    },
    fiendList: {
        fiendId:{
            type: ObjectId, 
            ref: 'Trainer',
            unique: true
        }
    }

})

module.exports = mongoose.model('Trainer', trainerSchema)