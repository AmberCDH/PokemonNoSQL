const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const pokemonSchema = new mongoose.Schema({
  name: {
    required: true,
    type: String,
  },
  abilities: {
    name: {
      type: String,
    },
  },
  gender: {
    required: true,
    type: String,
    enum: ["Male", "Female", "non-binair"],
    default: "non-binair",
  },
  weaknesses: {
    name: {
      type: String,
    },
  },
  type: {
    name: {
      type: String,
    },
  },
  stars: {
    type: Number,
  },
  trainerId: {
    type: ObjectId,
    ref: "Trainer",
  },
});

module.exports = mongoose.model("Pokemon", pokemonSchema);
