const express = require("express");
const jwt = require("jsonwebtoken");
const itemModel = require("../Models/Items");

const router = express.Router();

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null)
      return res.status(401).json({ message: "authorization missing" });
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, trainer) => {
      if (err) return res.status(403);
      req.trainer = trainer;
      next();
    });
  }

//Get all Items
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const items = await itemModel.find();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Get item
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const itemById = await itemModel.findById(req.params.id);
    res.json(itemById);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Create item
router.post("/", authenticateToken, async (req, res, next) => {
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
router.patch("/:id", authenticateToken, async (req, res) => {
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
router.delete("/:id", authenticateToken, async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await itemModel.findByIdAndDelete(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
