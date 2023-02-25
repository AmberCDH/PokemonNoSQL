const express = require("express");
const authenticateToken = require("../TokenService/Auth");
const TrainerModel = require("../Models/Trainer");
const PokemonModel = require("../Models/Pokemon");
const ItemModel = require("../Models/Items");
const neo4j = require("neo4j-driver");

const router = express.Router();
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_DB_NAME, process.env.NEO4J_PASSWORD)
);
const session = driver.session();

//Get all Trades
router.get("/", authenticateToken.authenticateToken, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ message: "authorization missing" });
  }
  const trainerId = await authenticateToken.decodeToken(token);
  var pokemon = [];
  var items = [];
  var tradings = [];
  try {
    const trades = await session.run(
      `MATCH (n:Trainer)-[r:TRADES]->(k) RETURN k`,
      {}
    );

    trades.records.forEach(function (record) {
      if (record._fields[0].labels == "Item") {
        items.push(record._fields[0].properties._id);
      }
      if (record._fields[0].labels == "Pokemon") {
        pokemon.push(record._fields[0].properties._id);
      }
    });
    const itemResults = await ItemModel.find({ _id: { $in: items } });
    const pokemonResults = await PokemonModel.find({ _id: { $in: pokemon } });
    tradings.push(itemResults);
    tradings.push(pokemonResults);
    return res.status(200).json({ tradings: tradings });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});
//Get one Trades by trainer
router.get(
  "/:idTrade/Trainer/:idTrainer",
  authenticateToken.authenticateToken,
  async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    const trainerId = await authenticateToken.decodeToken(token);
  }
);
//Create Trade
router.post("/", authenticateToken.authenticateToken, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ message: "authorization missing" });
  }
  const trainerIdTrade = await authenticateToken.decodeToken(token);
  const itemId = req.body.itemId;
  const pokemonId = req.body.pokemonId;
  try {
    if (pokemonId != null && itemId != null) {
      return res
        .status(400)
        .json({ message: "Trade only one item/pokemon at a time" })
        .end();
    } else if (pokemonId != null) {
      const pokemonById = await PokemonModel.findById(pokemonId);
      if (pokemonById != null && pokemonById.trainerId == trainerIdTrade) {
        await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer})-[r:OWNS]->(b:Pokemon {_id:$_id_pokemon}) DELETE r`,
          {
            _id_trainer: trainerIdTrade,
            _id_pokemon: pokemonId,
          }
        );
        await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer})-[r:TRADES]->(b:Pokemon {_id:$_id_pokemon}) DELETE r`,
          {
            _id_trainer: trainerIdTrade,
            _id_pokemon: pokemonId,
          }
        );
        await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer}) MATCH (b:Pokemon {_id:$_id_pokemon}) CREATE (a)-[r:TRADES]->(b)`,
          {
            _id_trainer: trainerIdTrade,
            _id_pokemon: pokemonId,
          }
        );
        return res.status(200).json({ trading: pokemonById }).end();
      } else {
        return res
          .status(400)
          .json({ message: "Pokemon does not belong to you" })
          .end();
      }
    } else if (itemId != null) {
      const itemById = await ItemModel.findById(itemId);
      if (itemById != null && itemById.trainerId == trainerIdTrade) {
        await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer})-[r:OWNS]->(b:Item {_id:$_id_item}) DELETE r`,
          {
            _id_trainer: trainerIdTrade,
            _id_item: itemId,
          }
        );
        await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer})-[r:TRADES]->(b:Item {_id:$_id_item}) DELETE r`,
          {
            _id_trainer: trainerIdTrade,
            _id_item: itemId,
          }
        );
        await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer}) MATCH (b:Item {_id:$_id_item}) CREATE (a)-[r:TRADES]->(b)`,
          {
            _id_trainer: trainerIdTrade,
            _id_item: itemId,
          }
        );
        return res.status(200).json({ trading: itemById });
      } else {
        return res
          .status(400)
          .json({ message: "Item does not belong to you" })
          .end();
      }
    } else {
      return res
        .status(400)
        .json({
          message: "You have not added a pokemon or item to make a trade",
        })
        .end();
    }
  } catch (error) {
    return res.status(400).json({ message: error.message }).end();
  }
});
//Delete Trade

//Get all request by trainer
//Get one request by trainer

//Accept request
//Decline request

module.exports = router;
