const express = require("express");
const jwt = require("jsonwebtoken");
const TrainerModel = require("../Models/Trainer");
const bcrypt = require("bcrypt");
const neo4j = require("neo4j-driver");

const router = express.Router();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_DB_NAME, process.env.NEO4J_PASSWORD)
);
const session = driver.session();

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null)
    return res.status(401).json({ message: "authorization missing" });
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, trainer) => {
    if (err) return res.status(403);
    req.trainer = trainer;
    next();
  });
}

//Get All Trainers
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const trainers = await TrainerModel.find();
    res.status(200).json(trainers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Get Trainer
router.get("/:id", authenticateToken, async (req, res, next) => {
  try {
    const trainerById = await TrainerModel.findById(req.params.id);
    res.json(trainerById);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Update Trainer
router.patch("/:id", authenticateToken, async (req, res, next) => {
  try {
    const id = req.params.id;
    const updatedTrainer = req.body;
    const options = { new: true };

    const result = await TrainerModel.findByIdAndUpdate(
      id,
      updatedTrainer,
      options
    );

    const updateRes = await session.run(
      `MATCH (n:Trainer {_id: $_id}) SET n = {username : $username, email: $email, _id: $_id} RETURN n`,
      {
        username: result.username,
        email: result.email,
        _id: id,
      }
    );

    res.send(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Register Trainer
router.post("/", async (req, res, next) => {
  const trainer = new TrainerModel({
    username: req.body.username,
    password: await bcrypt.hash(req.body.password, 10),
    email: req.body.email,
    birthday: req.body.birthday,
    region: {
      regionName: req.body.region.regionName,
      route: req.body.region.route,
      champion: req.body.region.champion,
    },
  });
  try {
    const registerTrainer = await trainer.save();
    const accessToken = jwt.sign(
      { registerTrainer },
      process.env.ACCESS_TOKEN_SECRET
    );
    const result = await session.run(
      `CREATE (n:Trainer {username: $username, email: $email, _id: $_id}) return n`,
      {
        username: registerTrainer.username,
        email: registerTrainer.email,
        _id: registerTrainer.id,
      }
    );
    res.status(200).json({ accessToken: accessToken });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Login Trainer
router.post("/Login", async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({
      message: "Username or Password not present",
    });
  }
  try {
    const trainer = await TrainerModel.findOne({ email: req.body.email });
    if (!trainer) {
      res.status(401).json({
        message: "Login not successful",
        error: "User not found",
      });
    } else {
      bcrypt.compare(password, trainer.password).then(function (result) {
        if (result == true) {
          const accessToken = jwt.sign(
            { trainer },
            process.env.ACCESS_TOKEN_SECRET
          );
          res.status(200).json({ accessToken: accessToken });
        } else {
          res.status(400).json({ message: "Login not succesful" });
        }
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Delete Trainer
router.delete("/:id", authenticateToken, async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await TrainerModel.findByIdAndDelete(id);
    const deleteRes = await session.run(
      `MATCH (n:Trainer {_id: $_id}) DELETE n`,
      {
        _id: id,
      }
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Accept friendRequest
router.patch("/:id/Request", authenticateToken, async (req, res, next) => {
  try {
    const id = req.params.id;
    const options = { new: true };
    const idFriend = req.body.fiendList.fiendId;
    const trainer = await TrainerModel.findById(id);
    const friendRequest = await TrainerModel.findById(idFriend);
    const friends = friendRequest.fiendList.toJSON();
    if (friends && Object.keys(friends).length === 0) {
    } else {
      for (let friend of friends) {
        if (friend.fiendId == id) {
          return res
            .status(400)
            .json({ message: "U were already friends" })
            .end();
        }
      }
    }

    if (trainer && friendRequest) {
      const result = await TrainerModel.findOneAndUpdate(
        { _id: id },
        {
          $push: {
            fiendList: {
              fiendId: idFriend,
              username: friendRequest.username,
            },
          },
        }
      );
      const friendSave = await TrainerModel.findOneAndUpdate(
        { _id: idFriend },
        {
          $push: {
            fiendList: {
              fiendId: id,
              username: trainer.username,
            },
          },
        }
      );
      const friendship = await session.run(
        `MATCH (a:Trainer {_id: $_id_a}) MATCH (b:Trainer {_id: $_id_b}) CREATE (a)-[relation:FRIENDS_WITH]->(b)`,
        {
          _id_a: trainer.id,
          _id_b: friendRequest.id,
        }
      );
      return res
        .status(200)
        .json({ Trainer: result, Friend: friendSave })
        .end();
    } else {
      return res.status(400).json({ message: "No Trainers found :(" }).end();
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Trainer can see friends of friends
router.get("/:id/FriendsOfFriends", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    var ids = [];
    const friendOfFriend = await session.run(
      `MATCH (n:Trainer {_id: $_id}) MATCH  (n)-[:FRIENDS_WITH*2]-(m) WHERE NOT (n)-[:FRIENDS_WITH]-(m) RETURN m`, 
      {
        _id: id
      }
      ).then(function(result){
        result.records.forEach(function(record){
          ids.push(record._fields[0].properties._id);
        })
        return ids
      })
      .then((ids)=>{
        TrainerModel.find({_id: { $in: ids}})
            .then((trainersFriends) => {
            res.status(200).json(trainersFriends);
          })
      })
      .catch((error) => {
        res.status(400).json(error);
      })
      // return res.status(200).json({friendsOfFriends: friendOfFriend}).end()
  } catch (error) {
    return res.status(400).json({message:error.message}).end()
  }
});

module.exports = router;
