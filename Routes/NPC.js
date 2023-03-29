const express = require("express");
const authenticateToken = require("../TokenService/Auth");
const NPCModel = require("../Models/NPC");
const neo4j = require("neo4j-driver");
const mongoose = require("mongoose");

const router = express.Router();
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_DB_NAME, process.env.NEO4J_PASSWORD)
);
const session = driver.session();

//Get all NPC's
router.get("/", authenticateToken.authenticateToken, async (req, res, next) => {
  try {
    const npcs = await NPCModel.find();
    if (npcs.length > 0) {
      return res.status(200).json(npcs).end();
    }
    return res.status(200).json({ message: "NPC's do not exist yet" }).end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Get NPC
router.get("/:id", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const npcById = await NPCModel.findById(req.params.id);
    res.json(npcById);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Create NPC
router.post("/", authenticateToken.authenticateToken, async (req, res) => {
  const npc = new NPCModel({
    name: req.body.name,
    age: req.body.age,
    gender: req.body.gender,
    commentList: req.body.commentList,
    friendly: req.body.friendly,
  });
  try {
    const npcSave = await npc.save();
    const result = await session.run(
      `CREATE (n:NPC {_id: $_id, name: $name})`,
      {
        _id: npcSave.id,
        name: npcSave.name,
      }
    );
    res.status(200).json({ NPC: npcSave });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Insert Comment
router.post(
  "/:idNPC/comment",
  authenticateToken.authenticateToken,
  async (req, res) => {
    try {
      const updateNPC = await NPCModel.findById(req.params.idNPC);
      if (updateNPC.name.length > 0) {
        updateNPC.commentList.push(req.body.comment);
        await updateNPC.save();
      } else {
        return res.status(400).json({ message: "Bad request" }).end();
      }
      
      const updatedNPC = await NPCModel.findById(req.params.idNPC);
      return res.status(200).json({ NPC: updatedNPC }).end();
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

//Update NPC
router.patch("/:id", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const updatedNPC = req.body;
    const options = { new: true };

    const npcById = await NPCModel.findById(id);
    const result = await NPCModel.findByIdAndUpdate(id, updatedNPC, options);
    const updateNPC = await session.run(
      `MATCH (n:NPC {_id: $_id}) SET n = {name: $name, _id:$_id} RETURN n`,
      {
        _id: id,
        name: result.name,
      }
    );
    res.send(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Delete NPC
router.delete("/:id", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const result = await NPCModel.findByIdAndDelete(id);
    const itemToDelete = await session.run(
      `MATCH (n:NPC {_id:$_id}) DETACH DELETE n`,
      {
        _id: id,
      }
    );
    res.status(200).json({ deleted: result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
