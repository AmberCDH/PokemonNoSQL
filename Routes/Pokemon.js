const express = require("express");
const authenticateToken = require("../TokenService/Auth")
const PokemonModel = require("../Models/Pokemon");

const router = express.Router();


//Get All Pokemon
router.get("/", authenticateToken.authenticateToken, async (req, res, next) => {
  try {
    const pokemon = await PokemonModel.find();
    res.status(200).json(pokemon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Get Pokemon
router.get("/:id", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const pokemonById = await PokemonModel.findById(req.params.id);
    res.json(pokemonById);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Create Pokemon
router.post("/", authenticateToken.authenticateToken, async (req, res, next) => {
  const pokemon = new PokemonModel({
    name: req.body.name,
    gender: req.body.gender,
    stars: req.body.stars,
    abilities: {
      name: req.body.abilities.name,
    },
    weaknesses: {
      name: req.body.weaknesses.name,
    },
    type: {
      name: req.body.type.name,
    },
  });
  try {
    const pokemonSave = await pokemon.save();
    res.status(200).json({ Pokemon: pokemonSave });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Update Pokemon
router.patch("/:id", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const updatedPokemon = req.body;
    const options = { new: true };

    const result = await PokemonModel.findByIdAndUpdate(
      id,
      updatedPokemon,
      options
    );

    res.send(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Delete pokemon
router.delete("/:id", authenticateToken.authenticateToken, async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await PokemonModel.findByIdAndDelete(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
