const express = require("express");
const jwt = require("jsonwebtoken");
const TrainerModel = require("../Models/Trainer");
const bcrypt = require("bcrypt");

const router = express.Router();


function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(' ')[1]
  if(token == null)return res.status(401).json({message: 'authorization missing'})
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, trainer) => {
    if(err) return res.status(403)
    req.trainer = trainer
    next()
  })
}

//Get All Trainers
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const trainers = await TrainerModel.find();
    res.json(trainers);
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
router.patch("/:id", authenticateToken,async (req, res, next) => {
  try {
    const id = req.params.id;
    const updatedTrainer = req.body;
    const options = { new: true };

    const result = await TrainerModel.findByIdAndUpdate(
      id,
      updatedTrainer,
      options
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
  });
  try {
    const registerTrainer = await trainer.save();
    const accessToken = jwt.sign({registerTrainer}, process.env.ACCESS_TOKEN_SECRET)
    res.status(200).json({accessToken:accessToken});
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
          const accessToken = jwt.sign({trainer}, process.env.ACCESS_TOKEN_SECRET)
          res.status(200).json({accessToken:accessToken});
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
router.delete("/:id", authenticateToken,async (req, res, next) => {
  try {
    const id = req.params.id;
    const result = await TrainerModel.findByIdAndDelete(id);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
