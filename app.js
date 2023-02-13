require("dotenv").config();

const TrainerRoute = require("./Routes/Trainer");
const PokemonRoute = require("./Routes/Pokemon");
const ItemRoute = require("./Routes/Item");
const RequestFriendshipRoute = require("./Routes/RequestFriendship");

const neo4j = require("neo4j-driver");
const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const mongoString = process.env.DATABASE_URL;
const port = process.env.PORT;

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_DB_NAME, process.env.NEO4J_PASSWORD)
);

mongoose.connect(mongoString);
const database = mongoose.connection;

database.on("error", (error) => {
  console.log(error);
});

database.once("connected", () => {
  console.log("Database Connected");
});

const app = express();

app.get("/get", async (req, res) => {
  const session = driver.session();
  const response = session.run(`MATCH (n) RETURN n`);

  res.json({
    status: "ok",
    path: (await response)
  });

  await session.close()
});

app.use(express.json());
app.use("/Item", ItemRoute);
app.use("/Pokemon", PokemonRoute);
app.use("/Trainer", TrainerRoute);
app.use("/Request", RequestFriendshipRoute);
app.use("/", function (req, res) {
  res.send("NoSQL pokemon API works");
});
const server = http.createServer(app);

server.listen(port);
console.debug("localhost:" + port + "/");
