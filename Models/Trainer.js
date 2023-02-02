const mongoose = require('mongoose');

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
    // regionId: {
    //     required: true
    // },
    // fiendList: {
    //     required: false
    // }

})

module.exports = mongoose.model('Trainer', trainerSchema)