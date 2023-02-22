const express = require("express");
const authenticateToken = require("../TokenService/Auth")
const itemModel = require("../Models/Items");

const router = express.Router();


//Get all Items
router.get("/", authenticateToken.authenticateToken, async (req, res, next) => {
  try {
    const items = await itemModel.find();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Get item
router.get("/:id", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const itemById = await itemModel.findById(req.params.id);
    res.json(itemById);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Create item
router.post("/", authenticateToken.authenticateToken, async (req, res, next) => {
  const item = new itemModel({
    name: req.body.name,
    effect: req.body.effect,
    category: req.body.category,
    amountInCoins: req.body.amountInCoins,
  });
  try {
    const itemSave = await item.save();
    res.status(200).json({ Pokemon: itemSave });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Update item
router.patch("/:id", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const updatedItem = req.body;
    const options = { new: true };

    const result = await itemModel.findByIdAndUpdate(id, updatedItem, options);

    res.send(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Delete pokemon
router.delete("/:id", authenticateToken.authenticateToken, async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await itemModel.findByIdAndDelete(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
