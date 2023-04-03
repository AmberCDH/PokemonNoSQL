const { MongoClient } = require("mongodb");

let token;
let idPokemon = "6422dece8c3dbe78ca8e0df2";

const neo4j = require("neo4j-driver");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("./mockApp");

let wierdId = "1";
let notYoursId = "63fde5a0eb804a98b3fcddb3";

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
    session = driver.session({database:process.env.NEO4J_DATABASE_NAME});
    const result = await request(app)
      .post("/Trainer/Login")
      .send({ email: "della@mail.com", password: "Wachtwoord" })
      .set("Content-Type", "application/json");
    token = result.body.accessToken;
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

  //-----Is not logged in-----
  describe("POST 'Pokemon/'", () => {
    it("should not be logged in", async () => {
      const tests = {
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
        .send(tests)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toEqual("authorization missing");
    });
  });

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

  //-----DOES NOT Create Pokemon-----
  describe("POST 'Pokemon/'", () => {
    it("should not insert a doc into pokemons", async () => {
      const tests = {
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
        .send(tests)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(400);
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

  //-----DOES NOT Get Pokemon-----
  describe("GET BY ID 'Pokemon/'", () => {
    it("Should not get one Pokemon", async () => {
      const res = await request(app)
        .get("/Pokemon/" + wierdId.toString())
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toEqual(
        "Could not find this Pokemon with id: " + wierdId
      );
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

  //-----DOES NOT Update Pokemon-----
  describe("UPDATE BY ID 'Pokemon/'", () => {
    it("Should not update one Pokemon", async () => {
      const pokemons = db.collection("pokemons");

      const pokemon = await pokemons.findOne({
        _id: mongoose.Types.ObjectId(idPokemon),
      });

      const updatePokemon = {
        stars: 500,
      };

      const res = await request(app)
        .patch("/Pokemon/" + notYoursId.toString())
        .set("Authorization", "Bearer " + token)
        .send(updatePokemon)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toEqual("Not authorized >_<");

      const updatedPokemon = await pokemons.findOne({
        _id: mongoose.Types.ObjectId(idPokemon),
      });

      expect(pokemon.stars).toEqual(updatedPokemon.stars);
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

  //-----DOES NOT Delete Pokemon-----
  describe("DELETE 'Pokemon/'", () => {
    it("should not delete a Pokemon", async () => {
      const res = await request(app)
        .delete("/Pokemon/" + notYoursId.toString())
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toEqual("Not authorized >_<");
    });
  });
});
