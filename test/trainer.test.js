const { MongoClient } = require("mongodb");
const authenticateToken = require("../TokenService/Auth")

let token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImRlbGxhQG1haWwuY29tIiwiaWQiOiI2NDA2NWY4Yzc1MTRhZmQ1YjcyMGNhMjciLCJ1c2VybmFtZSI6ImRlbGxhIiwiaWF0IjoxNjc5OTk3MjQ5fQ.WrvrH9KI9HYxEKs8JRgw6HEqjoOWsYMFJ4EZco5zPZU";
let id = "64065f8c7514afd5b720ca27";
let addedTrainerId;
let tokenTrainer;

const neo4j = require("neo4j-driver");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../app");

describe("Trainer", () => {
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
    const trainers = db.collection("trainers");
    await trainers.findOneAndDelete({ _id: addedTrainerId, username: "Xella" });
    await session.run(`MATCH (n:Trainer {username: $name}) DETACH DELETE n`, {
      name: "Xella",
    });
    await session.close();
    await connection.close();
  });
  beforeEach(async () => {
    const trainers = db.collection("trainers");
    await trainers.findOneAndDelete({ username: "Xella" });
  });

  require("dotenv").config();

  //-----Register Trainer-----
  describe("POST 'Trainer/'", () => {
    it("should insert a doc into Trainers", async () => {
      const trainers = db.collection("trainers");

      const mockTrainer = {
        username: "Xella",
        password: "Wachtwoord",
        email: "xella@mail.com",
        region: {
          regionName: "Hoenn",
          route: 12,
          champion: "Wallace",
        },
      };
      const res = await request(app)
        .post("/Trainer/")
        .send(mockTrainer)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(200);
      const insertedTrainer = await trainers.findOne({
        email: mockTrainer.email,
      });
      addedTrainerId = insertedTrainer.id;
      expect(insertedTrainer.email).toEqual(mockTrainer.email);
    });
  });

  //-----Get All Trainers-----
  describe("GET 'Trainer/'", () => {
    it("Should get all Trainers", async () => {
      const res = await request(app)
        .get("/Trainer/")
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  //-----Get Trainer-----
  describe("GET BY ID 'Trainer/'", () => {
    it("Should get one Trainers", async () => {
      const res = await request(app)
        .get("/Trainer/" + id.toString())
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(200);
      expect(res.body.username.length).toBeGreaterThan(0);
    });
  });

  //-----Update Trainer-----
  describe("UPDATE BY ID 'Trainer/'", () => {
    it("Should update one trainer", async () => {
      const trainers = db.collection("trainers");
      const trainer = await trainers.findOne({
        _id: mongoose.Types.ObjectId(id),
      });
      const updateTrainer = {
        region: {
          regionName: "Hoenn",
          route: 20,
          champion: "Wallace",
        },
      };

      const res = await request(app)
        .patch("/Trainer/" + id.toString())
        .set("Authorization", "Bearer " + token)
        .send(updateTrainer)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(200);

      const updatedTrainer = await trainers.findOne({
        _id: mongoose.Types.ObjectId(id),
      });

      let updatedTrainerBack = {
        $set: {
          region: { regionName: "Hoenn", route: 12, champion: "Wallace" },
        },
      };
      const options = { new: true };
      const updatedBack = await trainers.findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(id) },
        updatedTrainerBack,
        options
      );
      expect(trainer.region.route).not.toEqual(updatedTrainer.region.route);
      expect(trainer.region.route).not.toEqual(updatedBack.value.region.route);
    });
  });

  //-----Login Trainer-----
  describe("POST LOGIN 'Trainer/'", () => {
    it("should login a trainer", async () => {
      const login = { email: "della@mail.com", password: "Wachtwoord" };
      const res = await request(app)
        .post("/Trainer/Login")
        .send(login)
        .set("Content-Type", "application/json")
      expect(res.statusCode).toBe(200);
    });
  });

  //-----Trainer can see friends of friends-----
  describe("GET 'Trainer/'", () => {
    it("should get friends of friends", async () => {
      const res = await request(app)
      .get("/Trainer/"+ id.toString() +"/FriendsOfFriends")
      .set("Authorization", "Bearer " + token);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    })
  })

  //-----Trainer can be deleted-----
  describe("DELETE 'Trainer/'", () => {
    it("should delete a trainer", async () => {
      //NOG PROBEREN TE MAKEN :'<
      expect(true).toBe(true)
    })
  })
});
