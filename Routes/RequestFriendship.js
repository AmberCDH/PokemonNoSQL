const express = require("express");
const authenticateToken = require("../TokenService/Auth")
const RequestModel = require("../Models/RequestFriendship");
const TrainerModel = require("../Models/Trainer");

const router = express.Router();


router.post("/", authenticateToken.authenticateToken, async (req, res) => {
  const receiver = await TrainerModel.findById(req.body.receiver);
  const sender = await TrainerModel.findById(req.body.sender);
  if (receiver && sender) {
    const friendRequest = new RequestModel({
      sender: sender._id,
      receiver: receiver._id,
    });
    const request = await friendRequest.save();
    res.status(200).json(request);
  } else {
    res.status(400).json({ message: "No reciever/sender found" });
  }
});

router.get("/:id", authenticateToken.authenticateToken, async (req, res) => {
  const receiver = await TrainerModel.findById(req.params.id);
  if(receiver){
    const friendRequests = await RequestModel.find({receiver: receiver})
    res.status(200).json(friendRequests)
  }else {
    res.status(400).json({message: "User was not found"})
  }

});

router.delete("/:id", authenticateToken.authenticateToken, async (req, res)=> {
  try {
    const id = req.params.id;
    const deleteRequest = await RequestModel.findByIdAndDelete(id);
    res.status(200).json(deleteRequest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
})

module.exports = router;
