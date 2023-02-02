require('dotenv').config();

const TrainerRoute = require('./Routes/Trainer')

const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const mongoString = process.env.DATABASE_URL
const port = process.env.PORT

mongoose.connect(mongoString);
const database = mongoose.connection

database.on('error', (error) => {
    console.log(error)
})

database.once('connected', () => {
    console.log('Database Connected');
})


const app = express();
app.use(express.json());
app.use("/Trainer",TrainerRoute)
app.use('/', function(req, res) {
    res.send('NoSQL pokemon API works');
});
const server = http.createServer(app);

server.listen(port);console.debug('localhost:' + port + '/');

