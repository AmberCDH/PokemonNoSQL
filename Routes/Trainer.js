const express = require("express");
const jwt = require("jsonwebtoken");
const TrainerModel = require("../Models/Trainer");
const bcrypt = require("bcrypt");
const neo4j = require("neo4j-driver");
const authenticateToken = require("../TokenService/Auth");

const router = express.Router();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_DB_NAME, process.env.NEO4J_PASSWORD)
);
const session = driver.session();

//Get All Trainers
router.get("/", authenticateToken.authenticateToken, async (req, res, next) => {
  try {
    const trainers = await TrainerModel.find();
    if(trainers.length < 0){
      res.status(200).json(trainers)
    }
    res.status(200).json(trainers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Get Trainer
router.get("/:id", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    var idTrainer = await authenticateToken.decodeToken(token);
    if (idTrainer == null || req.params.id != idTrainer) {
      return res.status(401).json({ message: "Not authorized >_<" });
    }
    const trainerById = await TrainerModel.findById(req.params.id);
    res.json(trainerById);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Update Trainer
router.patch("/:id", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    var idTrainer = await authenticateToken.decodeToken(token);
    if (idTrainer == null || req.params.id != idTrainer) {
      return res.status(401).json({ message: "Not authorized >_<" });
    }
    const id = req.params.id;
    const updatedTrainer = req.body;
    const options = { new: true };

    const result = await TrainerModel.findByIdAndUpdate(
      id,
      updatedTrainer,
      options
    );

    if (updatedTrainer.region.regionName) {
      await checkAndCreateRegion(
        req.body.region.regionName,
        req.body.region.champion,
        id,
        true
      );
    }

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
router.post("/", async (req, res) => {
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
      { email: trainer.email, id: trainer.id, username: trainer.username },
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
    await checkAndCreateRegion(
      req.body.region.regionName,
      req.body.region.champion,
      registerTrainer.id,
      false
    );

    res.status(200).json({ accessToken: accessToken });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//Check and create a region
async function checkAndCreateRegion(regionName, champion, idTrainer, bool) {
  const sessionTwo = driver.session();
  var exists;
  try {
    if (bool) {
      const updateReqion = await session.run(
        `MATCH (t:Trainer {_id: $_id})-[relation:IS_IN]->() DELETE relation`,
        { _id: idTrainer }
      );
    }
    const obj = await session.run(
      `MATCH (r:Region {regionName: $regionName}) return r`,
      {
        regionName: regionName,
      }
    );
    exists = obj.records.length;
    if (exists == 0) {
      const region = await session.run(
        `CREATE (r:Region {regionName: $regionName}) return r`,
        {
          regionName: regionName,
          champion: champion,
        }
      );
    }
    const regionRelation = await session.run(
      `MATCH (a:Trainer {_id: $_id}) MATCH (b:Region {regionName: $regionName}) CREATE (a)-[relation:IS_IN]->(b)`,
      {
        _id: idTrainer,
        regionName: regionName,
      }
    );
  } catch (error) {
    throw error;
  }
}

//Login Trainer
router.post("/Login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      message: "Email or Password not present",
    }).end()
  }
  try {
    const trainer = await TrainerModel.findOne({ email: req.body.email });
    if (!trainer) {
      return res.status(401).json({
        message: "Login not successful",
        error: "User not found",
      }).end()
    } else {
      bcrypt.compare(password, trainer.password).then(function (result) {
        if (result == true) {
          const accessToken = jwt.sign(
            {
              email: trainer.email,
              id: trainer.id,
              username: trainer.username,
            },
            process.env.ACCESS_TOKEN_SECRET
          );
          return res.status(200).json({ accessToken: accessToken }).end()
        } else {
          return res.status(400).json({ message: "Login not succesful" }).end()
        }
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Delete Trainer
router.delete("/:id", authenticateToken.authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) {
      return res.status(401).json({ message: "authorization missing" });
    }
    var idTrainer = await authenticateToken.decodeToken(token);
    if (idTrainer == null || req.params.id != idTrainer) {
      return res.status(401).json({ message: "Not authorized >_<" });
    }
    const id = req.params.id;
    const result = await TrainerModel.findByIdAndDelete(id);
    const deleteRes = await session.run(
      `MATCH (n:Trainer {_id: $_id}) DETACH DELETE n`,
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
router.patch(
  "/:id/Request",
  authenticateToken.authenticateToken,
  async (req, res) => {
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
  }
);

//Trainer can see friends of friends
router.get(
  "/:id/FriendsOfFriends",
  authenticateToken.authenticateToken,
  async (req, res) => {
    try {
      const id = req.params.id;
      var ids = [];
      const friendOfFriend = await session
        .run(
          `MATCH (n:Trainer {_id: $_id}) MATCH  (n)-[:FRIENDS_WITH*2]-(m) WHERE NOT (n)-[:FRIENDS_WITH]-(m) RETURN m`,
          {
            _id: id,
          }
        )
        .then(function (result) {
          result.records.forEach(function (record) {
            ids.push(record._fields[0].properties._id);
          });
          return ids;
        })
        .then((ids) => {
          TrainerModel.find({ _id: { $in: ids } }).then((trainersFriends) => {
            res.status(200).json(trainersFriends);
          });
        })
        .catch((error) => {
          res.status(400).json(error);
        });
      // return res.status(200).json({friendsOfFriends: friendOfFriend}).end()
    } catch (error) {
      return res.status(400).json({ message: error.message }).end();
    }
  }
);

module.exports = router;
