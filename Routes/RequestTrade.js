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
const session = driver.session({database:process.env.NEO4J_DATABASE_NAME});

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
    const pokemon = await PokemonModel.findById(req.params.idTrade);
    const item = await ItemModel.findById(req.params.idTrade);

    var trade = [];

    try {
      if (pokemon != null) {
        if (pokemon.trainerId != req.params.idTrainer) {
          return res
            .status(400)
            .json({ message: "This Trainer does not have this Pokemon" });
        }
        const trades = await session
          .run(
            `MATCH (n:Trainer)-[r:TRADES]->(k:Pokemon {_id:$_id}) RETURN k`,
            { _id: req.params.idTrade }
          )
          .then(function (result) {
            result.records.forEach(function (record) {
              trade.push(record._fields[0].properties._id);
            });
            return trade;
          })
          .then((trade) => {
            PokemonModel.find({ _id: { $in: trade } }).then((pokemonTrade) => {
              res.status(200).json(pokemonTrade);
            });
          });
      } else if (item != null) {
        if (item.trainerId != req.params.idTrainer) {
          return res
            .status(400)
            .json({ message: "This Trainer does not have this Item" });
        }
        const trades = await session
          .run(`MATCH (n:Trainer)-[r:TRADES]->(k:Item {_id:$_id}) RETURN k`, {
            _id: req.params.idTrade,
          })
          .then(function (result) {
            result.records.forEach(function (record) {
              trade.push(record._fields[0].properties._id);
            });
            return trade;
          })
          .then((trade) => {
            ItemModel.find({ _id: { $in: trade } }).then((itemTrade) => {
              res.status(200).json(itemTrade);
            });
          });
      } else {
        return res.status(400).json({ message: "Item or Pokemon not found " });
      }
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
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
router.delete(
  "/:idTrade",
  authenticateToken.authenticateToken,
  async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    const trainerIdTrade = await authenticateToken.decodeToken(token);
    const tradeId = req.params.idTrade;
    try {
      const pokemon = await PokemonModel.findById(tradeId);
      const item = await ItemModel.findById(tradeId);
      if (pokemon != null) {
        if (pokemon.trainerId != trainerIdTrade) {
          return res
            .status(400)
            .json({ message: "Pokemon does not belong to you" })
            .end();
        }
        const deleteTP = await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer})-[r:TRADES]->(b:Pokemon {_id:$_id_pokemon}) DELETE r`,
          {
            _id_trainer: trainerIdTrade,
            _id_pokemon: pokemon.id,
          }
        );
        const deleteWantReq = await session.run(
          `MATCH (a:Trainer)-[r:WANTS]->(b:Pokemon {_id:$_id}) DELETE r`,
          { _id: pokemon.id }
        );
        const deleterOP = await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer})-[r:OWNS]->(b:Pokemon {_id:$_id_pokemon}) DELETE r`,
          {
            _id_trainer: trainerIdTrade,
            _id_pokemon: pokemon.id,
          }
        );
        const deleteRequest = await RequestTradeModel.deleteMany({
          receiver: mongoose.Types.ObjectId(trainerIdTrade),
          pokemonReceiver: pokemon.id,
        });
        await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer}) MATCH (b:Pokemon {_id:$_id_pokemon}) CREATE (a)-[r:OWNS]->(b)`,
          {
            _id_trainer: trainerIdTrade,
            _id_pokemon: pokemon.id,
          }
        );
        return res.status(200).json({ deletedTrade: pokemon }).end();
      } else if (item != null) {
        if (item.trainerId != trainerIdTrade) {
          return res
            .status(400)
            .json({ message: "Item does not belong to you" })
            .end();
        }
        const deleteTI = await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer})-[r:TRADES]->(b:Item {_id:$_id_item}) DELETE r`,
          {
            _id_trainer: trainerIdTrade,
            _id_item: item.id,
          }
        );
        const deleteWantReq = await session.run(
          `MATCH (a:Trainer)-[r:WANTS]->(b:Item {_id:$_id}) DELETE r`,
          { _id: item.id }
        );
        const deleteOI = await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer})-[r:OWNS]->(b:Item {_id:$_id_item}) DELETE r`,
          {
            _id_trainer: trainerIdTrade,
            _id_item: item.id,
          }
        );
        const deleteRequest = await RequestTradeModel.deleteMany({
          receiver: mongoose.Types.ObjectId(trainerIdTrade),
          itemReceiver: item.id,
        });
        await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer}) MATCH (b:Item {_id:$_id_item}) CREATE (a)-[r:OWNS]->(b)`,
          {
            _id_trainer: trainerIdTrade,
            _id_item: item.id,
          }
        );
        return res.status(200).json({ deletedTrade: item });
      } else {
        return res
          .status(400)
          .json({
            message: "You have not added a pokemon or item to delete a trade",
          })
          .end();
      }
    } catch (error) {
      return res.status(400).json({ message: error.message }).end();
    }
  }
);

//Trainer WANTS to trade
router.post(
  "/:idLikesToHave/Wants/:idTrade",
  authenticateToken.authenticateToken,
  async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    const trainerIdTrade = await authenticateToken.decodeToken(token);
    try {
      let trainerId;
      let pokemonId;
      let trainerIdSender;
      let trade;
      let pokemonItemIdSender;
      const pokemon = await PokemonModel.findById(req.params.idTrade); // me
      const item = await ItemModel.findById(req.params.idTrade); // me
      const pokemonTraded = await PokemonModel.findById(
        req.params.idLikesToHave
      ); // trader
      const itemTraded = await ItemModel.findById(req.params.idLikesToHave); // trader
      if (pokemonTraded != null) {
        trainerId = pokemonTraded.trainerId.valueOf();
        pokemonId = pokemonTraded.id.valueOf();
        if (pokemon != null) {
          pokemonItemIdSender = pokemon.id.valueOf();
          trade = new RequestTradeModel({
            sender: trainerIdTrade,
            receiver: trainerId,
            pokemonSender: pokemonItemIdSender,
            pokemonReceiver: pokemonId,
          });
        } else if (item != null) {
          pokemonItemIdSender = item.id.valueOf();
          trade = new RequestTradeModel({
            sender: trainerIdTrade,
            receiver: trainerId,
            pokemonReceiver: pokemonId,
            itemSender: pokemonItemIdSender,
          });
        }
      } else if (itemTraded != null) {
        trainerId = itemTraded.trainerId.valueOf();
        pokemonId = itemTraded.id.valueOf();
        if (pokemon != null) {
          pokemonItemIdSender = pokemon.id.valueOf();
          trade = new RequestTradeModel({
            sender: trainerIdTrade,
            receiver: trainerId,
            pokemonSender: pokemonItemIdSender,
            itemReceiver: pokemonId,
          });
        } else if (item != null) {
          pokemonItemIdSender = item.id.valueOf();
          trade = new RequestTradeModel({
            sender: trainerIdTrade,
            receiver: trainerId,
            itemSender: pokemonItemIdSender,
            itemReceiver: pokemonId,
          });
        }
      }

      var check;
      // Pokemon die je wilt traden
      if (pokemon != null) {
        if (pokemon.trainerId != trainerIdTrade) {
          return res
            .status(400)
            .json({
              message: "not your Pokemon to trade",
            })
            .end();
        }
        // Je ontvangt een pokemon of item
        check = (
          await session.run(
            `MATCH (n:Trainer {_id:$_id_trainer})-[r:TRADES]->(k {_id:$_id}) RETURN k`,
            {
              _id: req.params.idLikesToHave,
              _id_trainer: trainerId,
            }
          )
        ).records.length;
        if (check <= 0) {
          return res
            .status(400)
            .json({
              message: "Pokemon or Item is not tradeable",
            })
            .end();
        }

        const deleted = await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer})-[r:WANTS]->(b {_id:$_id}) DELETE r`,
          {
            _id_trainer: trainerIdTrade,
            _id: req.params.idLikesToHave,
          }
        );
        const tradeSave = await trade.save();
        await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer}) MATCH (b {_id:$_id_pokemon}) CREATE (a)-[r:WANTS]->(b)`,
          { _id_trainer: trainerIdTrade, _id_pokemon: req.params.idLikesToHave }
        );
        return res.status(200).json({ startedTrade: tradeSave }).end();
        //Item die je wilt traden
      } else if (item != null) {
        if (item.trainerId != trainerIdTrade) {
          return res
            .status(400)
            .json({
              message: "not your Item to trade",
            })
            .end();
        }
        // Je ontvangt een pokemon of item
        check = (
          await session.run(
            `MATCH (n:Trainer {_id:$_id_trainer})-[r:TRADES]->(k {_id:$_id}) RETURN k`,
            {
              _id: req.params.idLikesToHave,
              _id_trainer: trainerId,
            }
          )
        ).records.length;
        if (check <= 0) {
          return res
            .status(400)
            .json({
              message: "Pokemon or Item is not tradeable",
            })
            .end();
        }

        const deleted = await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer})-[r:WANTS]->(b {_id:$_id}) DELETE r`,
          {
            _id_trainer: trainerIdTrade,
            _id: req.params.idLikesToHave,
          }
        );
        const tradeSave = await trade.save();
        await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer}) MATCH (b {_id:$_id_item}) CREATE (a)-[r:WANTS]->(b)`,
          { _id_trainer: trainerIdTrade, _id_item: req.params.idLikesToHave }
        );
        return res.status(200).json({ startedTrade: tradeSave }).end();
      } else {
        return res
          .status(400)
          .json({
            message: "You have not added a pokemon or item to delete a trade",
          })
          .end();
      }
    } catch (error) {
      return res.status(400).json({ message: error.message }).end();
    }
  }
);

//Trainer DELETE a WANTED trade
router.delete(
  "/:idLikesToHave/Wants/:idTrade",
  authenticateToken.authenticateToken,
  async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    const trainerIdTrade = await authenticateToken.decodeToken(token);
    try {
      const pokemon = await PokemonModel.findById(req.params.idTrade); // me
      const item = await ItemModel.findById(req.params.idTrade); // me

      if (pokemon != null) {
        if (pokemon.trainerId != trainerIdTrade) {
          return res
            .status(400)
            .json({
              message: "not your Pokemon to trade",
            })
            .end();
        }
        const deleteRequest = await RequestTradeModel.deleteMany({
          sender: mongoose.Types.ObjectId(trainerIdTrade),
          pokemonSender: pokemon.id,
        });
        await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer})-[r:WANTS]->(b {_id:$_id}) DELETE r`,
          {
            _id_trainer: trainerIdTrade,
            _id: req.params.idLikesToHave,
          }
        );
        return res.status(200).json({ deletedWantToHave: pokemon }).end();
      } else if (item != null) {
        if (item.trainerId != trainerIdTrade) {
          return res
            .status(400)
            .json({
              message: "not your Item to trade",
            })
            .end();
        }
        const deleteRequest = await RequestTradeModel.deleteMany({
          sender: mongoose.Types.ObjectId(trainerIdTrade),
          pokemonSender: item.id,
        });
        await session.run(
          `MATCH (a:Trainer {_id:$_id_trainer})-[r:WANTS]->(b {_id:$_id}) DELETE r`,
          {
            _id_trainer: trainerIdTrade,
            _id: req.params.idLikesToHave,
          }
        );
        return res.status(200).json({ deletedWantToHave: item }).end();
      } else {
        return res
          .status(400)
          .json({
            message: "You have not added a pokemon or item to delete a trade",
          })
          .end();
      }
    } catch (error) {
      return res.status(400).json({ message: error.message }).end();
    }
  }
);

module.exports = router;
