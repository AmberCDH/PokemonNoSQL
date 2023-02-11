const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const itemSchema = new mongoose.Schema({
  name: {
    required: true,
    type: String,
  },
  effect: {
    required: true,
    type: String,
  },
  category: {
    required: true,
    type: String,
    enum: ['Medical Item', 'Poke ball', 'Battle Item', 'Berries', 'Evolution Item', 'Held Item']
  },
  amountInCoins: {
    required: true,
    type: Number,
  },
});
module.exports = mongoose.model("Item", itemSchema);
