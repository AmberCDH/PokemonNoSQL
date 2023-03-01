const express = require("express");
const authenticateToken = require("../TokenService/Auth");
const TrainerModel = require("../Models/Trainer");
const RequestTradeModel = require("../Models/RequestTrade");
const PokemonModel = require("../Models/Pokemon");
const ItemModel = require("../Models/Items");
const neo4j = require("neo4j-driver");
const mongoose = require('mongoose');

const router = express.Router();
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_DB_NAME, process.env.NEO4J_PASSWORD)
);
const session = driver.session();

//Get all TRADE requests by trainer
router.get("/",authenticateToken.authenticateToken,
async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    const trainerIdTrade = await authenticateToken.decodeToken(token);
    try {
        const tradeRequests = await RequestTradeModel.find({receiver:trainerIdTrade});
        // let listOfItems = tradeRequests.map(a => a.itemSender)
        // let listOfPokemons = tradeRequests.map(a => a.pokemonSender)
        // console.log(listOfPokemons)
        // console.log(listOfItems)
        // const allItems = await ItemModel.find({id:{$in:listOfItems}})
        // const allPokemons = await PokemonModel.find({id:{$in:listOfPokemons}})
        res.status(200).json({tradeRequests:tradeRequests});
      } catch (error) {
        res.status(500).json({ message: error.message });
    }
})

//Get one TRADE request by trainer
router.get("/:id",authenticateToken.authenticateToken,
async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    const trainerIdTrade = await authenticateToken.decodeToken(token);
    try {
        const tradeRequests = await RequestTradeModel.find({receiver:trainerIdTrade, _id:mongoose.Types.ObjectId(req.params.id)});
        res.status(200).json(tradeRequests);
      } catch (error) {
        res.status(500).json({ message: error.message });
    }
})

//Get all WANT requests by trainer

//Get one TRADE request by trainer

//Accept request
//Decline request

module.exports = router;
