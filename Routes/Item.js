const express = require("express");
const authenticateToken = require("../TokenService/Auth");
const itemModel = require("../Models/Items");
const neo4j = require("neo4j-driver");

const router = express.Router();
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_DB_NAME, process.env.NEO4J_PASSWORD)
);
const session = driver.session();

//Get all Items
router.get("/", authenticateToken.authenticateToken, async (req, res, next) => {
  try {
    const items = await itemModel.find();
    if (items.length > 0) {
      return res.status(200).json(items).end();
    }
    return res.status(200).json({ message: "Items do not exist yet" }).end();
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
router.post("/", authenticateToken.authenticateToken, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ message: "authorization missing" });
  }
  var idTrainer = await authenticateToken.decodeToken(token);

  const item = new itemModel({
    name: req.body.name,
    effect: req.body.effect,
    category: req.body.category,
    amount: req.body.amount,
    trainerId: idTrainer,
  });
  try {
    const itemSave = await item.save();
    const result = await session.run(
      `CREATE (n:Item {_id: $_id, name: $name, amount: $amount})`,
      {
        _id: itemSave.id,
        name: itemSave.name,
        amount: itemSave.amount,
      }
    );
    const createRelationship = await session.run(
      `MATCH (a:Trainer{_id: $_id_trainer}) MATCH (b:Item {_id: $_id_item}) CREATE (a)-[relationship:OWNS]->(b)`,
      {
        _id_trainer: idTrainer,
        _id_item: itemSave.id,
      }
    );
    res.status(200).json({ item: itemSave });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Update item
router.patch("/:id", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    var idTrainer = await authenticateToken.decodeToken(token);

    const id = req.params.id;
    const updatedItem = req.body;
    const options = { new: true };

    const itemById = await itemModel.findById(id);

    if (itemById.trainerId == idTrainer) {
      const result = await itemModel.findByIdAndUpdate(
        id,
        updatedItem,
        options
      );
      const updateItem = await session.run(
        `MATCH (n:Item {_id: $_id}) SET n = {name: $name, amount:$amount, _id:$_id} RETURN n`,
        {
          _id: id,
          name: result.name,
          amount: result.amount,
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

    const itemById = await itemModel.findById(id);

    if (itemById.trainerId == idTrainer) {
      const result = await itemModel.findByIdAndDelete(id);
      const itemToDelete = await session.run(
        `MATCH (n:Item {_id:$_id}) DETACH DELETE n`,
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
