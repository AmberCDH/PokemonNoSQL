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
        res.status(500).json({ message: error.message });
        return res.status(400).json({ message: "Bad request" }).end();
      }
    } catch (error) {}
  }
);

//Accept request
router.patch(
  "/:idRequest/Trade",
  authenticateToken.authenticateToken,
  async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    const trainerIdTrade = await authenticateToken.decodeToken(token);
    try {
      const tradeRequest = await RequestTradeModel.findOne({
        _id: req.params.idRequest,
      });
      if (trainerIdTrade != tradeRequest.receiver) {
        return res.status(400).json({ message: "you do not own this request" });
      }

      var pokemonOrItemSender;
      var senderId;
      var pokemonOrItemReceiver;
      var receiverId;
      const options = { new: true };

      senderId = tradeRequest.sender;
      receiverId = tradeRequest.receiver;

      //pokemon or item sender
      if (tradeRequest.pokemonSender != null) {
        pokemonOrItemSender = tradeRequest.pokemonSender;
        await PokemonModel.findByIdAndUpdate(
          pokemonOrItemSender,
          { trainerId: tradeRequest.receiver },
          options
        );
        await RequestTradeModel.deleteMany({
          sender: senderId,
          pokemonSender: pokemonOrItemSender,
        });
      } else if (tradeRequest.itemSender != null) {
        pokemonOrItemSender = tradeRequest.itemSender;
        await ItemModel.findByIdAndUpdate(
          pokemonOrItemSender,
          { trainerId: tradeRequest.receiver },
          options
        );
        await RequestTradeModel.deleteMany({
          sender: senderId,
          itemSender: pokemonOrItemSender,
        });
      }
      //pokemon or item receiver
      if (tradeRequest.pokemonReceiver != null) {
        pokemonOrItemReceiver = tradeRequest.pokemonReceiver;
        await PokemonModel.findByIdAndUpdate(
          pokemonOrItemReceiver,
          { trainerId: tradeRequest.sender },
          options
        );
        await RequestTradeModel.deleteMany({
          receiver: receiverId,
          pokemonReceiver: pokemonOrItemReceiver,
        });
      } else if (tradeRequest.itemReceiver != null) {
        pokemonOrItemReceiver = tradeRequest.itemReceiver;
        await ItemModel.findByIdAndUpdate(
          pokemonOrItemReceiver,
          { trainerId: tradeRequest.sender },
          options
        );
        await RequestTradeModel.deleteMany({
          receiver: receiverId,
          itemReceiver: pokemonOrItemReceiver,
        });
      }

      const deletedRReceiver = await session.run(
        `MATCH (n {_id:$_id})<-[r]-() DELETE r`,
        {
          _id: pokemonOrItemReceiver.toString(),
        }
      );

      const deletedRSender = await session.run(
        `MATCH (n {_id:$_id})<-[r]-() DELETE r`,
        {
          _id: pokemonOrItemSender.toString(),
        }
      );

      //Create relationship owns
      const createRSender = await session.run(
        `MATCH (a:Trainer {_id:$id_trainer}) MATCH (b {_id:$id}) CREATE (a)-[r:OWNS]->(b) RETURN r`,
        {
          id_trainer: senderId.toString(),
          id: pokemonOrItemReceiver.toString(),
        }
      );
        
      const createRReceiver = await session.run(
        `MATCH (a:Trainer {_id:$id_trainer}) MATCH (b {_id:$id}) CREATE (a)-[r:OWNS]->(b) RETURN r`,
        {
          id_trainer: receiverId.toString(),
          id: pokemonOrItemSender.toString(),
        }
      );

      res.status(200).json({ requestAccepted: tradeRequest });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);
//Decline request
router.delete(
  "/:idRequest/Trade",
  authenticateToken.authenticateToken,
  async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    const trainerIdTrade = await authenticateToken.decodeToken(token);
    try {
      //Request moet verwijderd worden
      const tradeRequest = await RequestTradeModel.findOne({receiver:trainerIdTrade, _id:req.params.idRequest})
      const tradeRequests = await RequestTradeModel.deleteMany({receiver:trainerIdTrade, sender:tradeRequest.sender, itemSender:tradeRequest.itemSender, pokemonSender:tradeRequest.pokemonSender})
      if (trainerIdTrade != tradeRequest.receiver) {
        return res.status(400).json({ message: "you do not own this request" });
      }
      
      //de want request moet verwijderd worden
      var pokemonOrItemReceiver;
      if (tradeRequest.pokemonReceiver != null) {
        pokemonOrItemReceiver = tradeRequest.pokemonReceiver;
      } else if (tradeRequest.itemReceiver != null) {
        pokemonOrItemReceiver = tradeRequest.itemReceiver;
      }
      
      var requestId = tradeRequest.sender
      const deletedRReceiver = await session.run(
        `MATCH (n {_id:$_id})<-[r]-(b:Trainer {_id:$trainerId}) DELETE r`,
        {
          _id: pokemonOrItemReceiver.toString(),
          trainerId: requestId.toString()
        }
      );
      res.status(200).json({ DeclinedRequest: tradeRequest });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
