const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const NPCSchema = new mongoose.Schema({
  name: {
    required: true,
    type: String,
  },
  age: {
    required: true,
    type: Number,
  },
  gender: {
    required: true,
    type: String,
    enum: ["Male", "Female", "non-binair"],
    default: "non-binair",
  },
  commentList: {
    type: [String],
    required: false
  },
  
  friendly:{
    required: true,
    type:Boolean
  }
});

module.exports = mongoose.model("NPC", NPCSchema);
