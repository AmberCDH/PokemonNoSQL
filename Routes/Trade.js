const express = require("express");
const authenticateToken = require("../TokenService/Auth");
const TrainerModel = require("../Models/Trainer");
const RequestTradeModel = require("../Models/RequestTrade");
const PokemonModel = require("../Models/Pokemon");
const ItemModel = require("../Models/Items");
const neo4j = require("neo4j-driver");
const mongoose = require("mongoose");

const router = express.Router();
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_DB_NAME, process.env.NEO4J_PASSWORD)
);
const session = driver.session();

//Get all TRADE requests by trainer
router.get("/", authenticateToken.authenticateToken, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ message: "authorization missing" });
  }
  const trainerIdTrade = await authenticateToken.decodeToken(token);
  try {
    const tradeRequests = await RequestTradeModel.find({
      receiver: trainerIdTrade,
    });
    // let listOfItems = tradeRequests.map(a => a.itemSender)
    // let listOfPokemons = tradeRequests.map(a => a.pokemonSender)
    // console.log(listOfPokemons)
    // console.log(listOfItems)
    // const allItems = await ItemModel.find({id:{$in:listOfItems}})
    // const allPokemons = await PokemonModel.find({id:{$in:listOfPokemons}})
    res.status(200).json({ tradeRequests: tradeRequests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Get one TRADE request by trainer
router.get("/:id", authenticateToken.authenticateToken, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ message: "authorization missing" });
  }
  const trainerIdTrade = await authenticateToken.decodeToken(token);
  try {
    const tradeRequests = await RequestTradeModel.find({
      receiver: trainerIdTrade,
      _id: mongoose.Types.ObjectId(req.params.id),
    });
    res.status(200).json(tradeRequests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Get all WANT requests by trainer
router.get(
  "/:idTrainer/Wants",
  authenticateToken.authenticateToken,
  async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    const trainerIdTrade = await authenticateToken.decodeToken(token);
    try {
      var pokemon = [];
      var items = [];

      const wantRequests = await session.run(
        `MATCH (a:Trainer {_id:$_id})-[r:WANTS]->(n) RETURN n`,
        {
          _id: trainerIdTrade,
        }
      );

      wantRequests.records.forEach(function (record) {
        if (record._fields[0].labels == "Item") {
          items.push(record._fields[0].properties._id);
        }
        if (record._fields[0].labels == "Pokemon") {
          pokemon.push(record._fields[0].properties._id);
        }
      });

      var itemResults = await ItemModel.find({ _id: { $in: items } });
      var pokemonResults = await PokemonModel.find({ _id: { $in: pokemon } });

      if (req.params.idTrainer == trainerIdTrade) {
        return res
          .status(200)
          .json({
            WantRequests: {
              itemRequest: itemResults,
              pokemonRequests: pokemonResults,
            },
          })
          .end();
      } else {
        return res.status(400).json({ message: "Bad request" }).end();
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

//Get one TRADE request by trainer
router.get(
  "/:id/Trade/:idTrade",
  authenticateToken.authenticateToken,
  async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    const trainerIdTrade = await authenticateToken.decodeToken(token);
    try {
      var pokemon = [];
      var items = [];
      const tradeRequest = await session.run(
        `MATCH (a:Trainer {_id:$_id})-[r:TRADES]->(n {_id:$_id_trade}) RETURN n`,
        {
          _id: trainerIdTrade,
          _id_trade: req.params.idTrade,
        }
      );

      tradeRequest.records.forEach(function (record) {
        if (record._fields[0].labels == "Item") {
          items.push(record._fields[0].properties._id);
        }
        if (record._fields[0].labels == "Pokemon") {
          pokemon.push(record._fields[0].properties._id);
        }
      });

      var itemResults = await ItemModel.find({ _id: { $in: items } });
      var pokemonResults = await PokemonModel.find({ _id: { $in: pokemon } });
      if (itemResults.length > 0) {
        return res
          .status(200)
          .json({
            itemRequest: itemResults,
          })
          .end();
      } else if (pokemonResults.length > 0) {
        return res
          .status(200)
          .json({
            pokemonRequest: pokemonResults,
          })
          .end();
      } else if (itemResults.length <= 0 && pokemonResults.length <= 0) {
        return res.status(400).json({ message: "Bad request!" }).end();
      } else {
        return res.status(400).json({ message: "Bad request" }).end();
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

//Accept request (Alle request moeten verwijderd worden voor item/pokemon en alleen de eigenaar van de pokemon kan hem accepteren Pokemon/items worden verwisseld zowel in neo en mongo)
//Decline request (1 request kan verwijderd worden en alleen de eigenaar van het item kan deze request verwijderen)

module.exports = router;
