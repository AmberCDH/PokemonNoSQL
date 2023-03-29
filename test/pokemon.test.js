const { MongoClient } = require("mongodb");

let token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImRlbGxhQG1haWwuY29tIiwiaWQiOiI2NDA2NWY4Yzc1MTRhZmQ1YjcyMGNhMjciLCJ1c2VybmFtZSI6ImRlbGxhIiwiaWF0IjoxNjc5OTk3MjQ5fQ.WrvrH9KI9HYxEKs8JRgw6HEqjoOWsYMFJ4EZco5zPZU";
let idPokemon = "6422dece8c3dbe78ca8e0df2";

const neo4j = require("neo4j-driver");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("./mockApp");

let addedPokemonId;
describe("Pokemon", () => {
  let connection;
  let db;
  let session;

  beforeAll(async () => {
    connection = await MongoClient.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    db = await connection.db("test");

    const driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_DB_NAME, process.env.NEO4J_PASSWORD)
    );
    session = driver.session();
  });
  afterAll(async () => {
    const pokemons = db.collection("pokemons");
    await pokemons.findOneAndDelete({ _id: addedPokemonId, name: "Test" });
    await session.run(`MATCH (n:Pokemon {name: $name}) DETACH DELETE n`, {
      name: "Test",
    });
    await session.close();
    await connection.close();
  });
  beforeEach(async () => {
    const pokemons = db.collection("pokemons");
    await pokemons.findOneAndDelete({ name: "Test" });
    await session.run(`MATCH (n:Pokemon {name: $name}) DETACH DELETE n`, {
      name: "Test",
    });
  });

  require("dotenv").config();

  //-----Create Pokemon-----
  describe("POST 'Pokemon/'", () => {
    it("should insert a doc into pokemons", async () => {
      const pokemons = db.collection("pokemons");

      const mockPokemon = {
        name: "Test",
        gender: "Male",
        stars: 2,
        abilities: {
          name: "Overgrow",
        },
        weaknesses: {
          name: "Fire",
        },
        type: {
          name: "Grass",
        },
      };

      const res = await request(app)
        .post("/Pokemon/")
        .set("Authorization", "Bearer " + token)
        .send(mockPokemon)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(200);
      const insertedPokemon = await pokemons.findOne({
        name: mockPokemon.name,
      });
      addedPokemonId = insertedPokemon.id;
      expect(insertedPokemon.name).toEqual(mockPokemon.name);
    });
  });

  //-----Get All Pokemons-----
  describe("GET All 'Pokemon/'", () => {
    it("Should get all Pokemon", async () => {
      const res = await request(app)
        .get("/Pokemon/")
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  //-----Get Pokemon-----
  describe("GET BY ID 'Pokemon/'", () => {
    it("Should get one Pokemon", async () => {
      const res = await request(app)
        .get("/Pokemon/" + idPokemon.toString())
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(200);
      expect(res.body.name.length).toBeGreaterThan(0);
    });
  });

  //-----Update Pokemon-----
  describe("UPDATE BY ID 'Pokemon/'", () => {
    it("Should update one Pokemon", async () => {
      const pokemons = db.collection("pokemons");

      const pokemon = await pokemons.findOne({
        _id: mongoose.Types.ObjectId(idPokemon),
      });

      const updatePokemon = {
        stars: 500,
      };

      const res = await request(app)
        .patch("/Pokemon/" + idPokemon.toString())
        .set("Authorization", "Bearer " + token)
        .send(updatePokemon)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(200);

      const updatedPokemon = await pokemons.findOne({
        _id: mongoose.Types.ObjectId(idPokemon),
      });

      let updatedPokemonBack = {
        $set: {
          stars: 2,
        },
      };

      const options = { new: true };
      const updatedBack = await pokemons.findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(idPokemon) },
        updatedPokemonBack,
        options
      );

      expect(pokemon.stars).not.toEqual(updatedPokemon.stars);
      expect(pokemon.stars).not.toEqual(updatedBack.value.stars);
    });
  });

  //-----Delete Pokemon-----
  describe("DELETE 'Pokemon/'", () => {
    it("should delete a Pokemon", async () => {
      const pokemons = db.collection("pokemons");

      const mockPokemon = {
        name: "Test",
        gender: "Male",
        stars: 2,
        abilities: {
          name: "Overgrow",
        },
        weaknesses: {
          name: "Fire",
        },
        type: {
          name: "Grass",
        },
      };

      const inserted = await request(app)
        .post("/Pokemon/")
        .set("Authorization", "Bearer " + token)
        .send(mockPokemon)
        .set("Content-Type", "application/json");
      const insertedPokemon = await pokemons.findOne({
        name: mockPokemon.name,
      });
      addedPokemonId = insertedPokemon._id;

      const res = await request(app)
        .delete("/Pokemon/" + addedPokemonId.toString())
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(200);
    });
  });
});
