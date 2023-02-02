const express=require('express')
const router=express.Router()

//Get All Trainers
router.get("/",(req,res)=>{
    res.send("Trainer route is displaying data")
})

//Get Trainer
router.get("/:id",(req,res)=> {
    res.send("Trainer profile")
})

//Update Trainer
router.patch("/:id",(req,res)=> {
    res.send("Update Trainer")
})

//Register Trainer
router.post("/Register",(req,res)=> {
    res.send("Register Trainer")
})

//Login Trainer
router.post("/Login",(req,res)=> {
    res.send("Login Trainer")
})

//Delete Trainer
router.delete("/:id",(req,res)=>{
    res.send("Delete Trainer")
})



module.exports=router;