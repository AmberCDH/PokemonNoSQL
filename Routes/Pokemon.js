const express = require("express");
const authenticateToken = require("../TokenService/Auth");
const PokemonModel = require("../Models/Pokemon");
const neo4j = require("neo4j-driver");

const router = express.Router();
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_DB_NAME, process.env.NEO4J_PASSWORD)
);
const session = driver.session({database:process.env.NEO4J_DATABASE_NAME});

//Get All Pokemon
router.get("/", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const pokemon = await PokemonModel.find();
    if (pokemon.length > 0) {
      return res.status(200).json(pokemon).end();
    }
    return res.status(200).json({ message: "Pokemon do not exist yet" }).end();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Get Pokemon
router.get("/:id", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const pokemonById = await PokemonModel.findById(req.params.id);
    res.json(pokemonById);
  } catch (error) {
    res.status(400).json({ message: "Could not find this Pokemon with id: " + req.params.id});
  }
});

//Create Pokemon
router.post("/", authenticateToken.authenticateToken, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ message: "authorization missing" });
  }
  var idTrainer = await authenticateToken.decodeToken(token);

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
    trainerId: idTrainer,
  });
  try {
    const pokemonSave = await pokemon.save();
    const result = await session.run(
      `CREATE (n:Pokemon {_id: $_id, name:$name, stars:$stars})`,
      {
        _id: pokemonSave.id,
        name: pokemonSave.name,
        stars: pokemonSave.stars,
      }
    );
    const createRelationship = await session.run(
      `MATCH (a:Trainer{_id: $_id_trainer}) MATCH (b:Pokemon {_id: $_id_pokemon}) CREATE (a)-[relationship:OWNS]->(b)`,
      {
        _id_trainer: idTrainer,
        _id_pokemon: pokemonSave.id,
      }
    );
    res.status(200).json({ Pokemon: pokemonSave });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Update Pokemon
router.patch("/:id", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    var idTrainer = await authenticateToken.decodeToken(token);

    const id = req.params.id;
    const updatedPokemon = req.body;
    const options = { new: true };

    const pokemonById = await PokemonModel.findById(id);

    if (pokemonById.trainerId == idTrainer) {
      const result = await PokemonModel.findByIdAndUpdate(
        id,
        updatedPokemon,
        options
      );
      const updatePokemon = await session.run(
        `MATCH (n:Pokemon {_id: $_id}) SET n = {_id: $_id, name:$name, stars:$stars} RETURN n`,
        {
          _id: id,
          name: result.name,
          stars: result.stars,
        }
      );
      res.send(result);
    } else {
      return res.status(401).json({ message: "Not authorized >_<" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Delete pokemon
router.delete("/:id", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    var idTrainer = await authenticateToken.decodeToken(token);

    const id = req.params.id;

    const pokemonById = await PokemonModel.findById(id);

    if (pokemonById.trainerId == idTrainer) {
      const result = await PokemonModel.findByIdAndDelete(id);
      const pokemonDelete = await session.run(
        `MATCH (n:Pokemon {_id:$_id}) DETACH DELETE n`,
        {
          _id: id,
        }
      );
      res.status(200).json({ deleted: result });
    } else {
      return res.status(401).json({ message: "Not authorized >_<" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
