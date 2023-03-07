const express = require("express");
const authenticateToken = require("../TokenService/Auth");
const neo4j = require("neo4j-driver");
const PokemonModel = require("../Models/Pokemon");
const ItemModel = require("../Models/Items");

const router = express.Router();
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_DB_NAME, process.env.NEO4J_PASSWORD)
);
const session = driver.session();

//get all regions
router.get("/", authenticateToken.authenticateToken, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ message: "authorization missing" });
  }
  const trainerIdTrade = await authenticateToken.decodeToken(token);
  try {
    var regions = [];
    const getAll = await session.run(`MATCH (n:Region) RETURN n`);
    getAll.records.forEach(function (record) {
      regions.push(record._fields[0].properties.regionName);
    });
    if (regions.length > 0) {
      return res.status(200).json({ Regions: regions }).end();
    } else {
      return res.status(400).json({ Message: "Regions are not found" }).end();
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//get specific region
router.post("/", authenticateToken.authenticateToken, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ message: "authorization missing" });
  }
  const trainerIdTrade = await authenticateToken.decodeToken(token);
  try {
    const regionName = req.body.regionName;
    var regions = [];
    const getAll = await session.run(
      `MATCH (n:Region {regionName:$regionName}) RETURN n`,
      { regionName: regionName }
    );
    getAll.records.forEach(function (record) {
      regions.push(record._fields[0].properties.regionName);
    });
    if (regions.length > 0) {
      return res.status(200).json({ Regions: regions }).end();
    } else {
      return res.status(400).json({ Message: "Region is not found" }).end();
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Top trades of a region
router.post(
  "/TopTrader",
  authenticateToken.authenticateToken,
  async (req, res) => {
    try {
      const regionName = req.body.regionName;
      var trainers = [];
      var id;
      var tradesPokemon = [];
      var tradesItem = [];
      const getTrainerWMostTrades = await session.run(
        `MATCH (n:Region {regionName:$regionName}) MATCH (a)<-[:IS_IN]-(b: Trainer) MATCH (b)-[d:TRADES]->(c) RETURN b, COUNT(d) ORDER BY COUNT(d) DESC LIMIT 1`,
        { regionName: regionName }
      );
      getTrainerWMostTrades.records.forEach(function (record) {
        trainers.push(record._fields[0].properties);
        id = record._fields[0].properties._id
      });
      console.log(id + " ID :>");
      const getTrades = await session.run(
        `MATCH (a:Trainer{_id:$trainerId}) MATCH (a)-[:TRADES]->(c) RETURN c`,
        { trainerId: id }
      );

      getTrades.records.forEach(function (record) {
        if (record._fields[0].labels == "Item") {
          tradesItem.push(record._fields[0].properties._id);
        }
        if (record._fields[0].labels == "Pokemon") {
          tradesPokemon.push(record._fields[0].properties._id);
        }
      });
      const itemResults = await ItemModel.find({ _id: { $in: tradesItem } });
      const pokemonResults = await PokemonModel.find({ _id: { $in: tradesPokemon } });

      if (trainers.length > 0) {
        return res
          .status(200)
          .json({
            Tradings: {
              TrainerWithTheMostTrades: trainers,
              Trades: { Pokemon: pokemonResults, Items: itemResults },
            },
          })
          .end();
      } else {
        return res
          .status(400)
          .json({ Message: "No one trades in this region" })
          .end();
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
