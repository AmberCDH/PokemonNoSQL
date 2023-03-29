const { MongoClient } = require("mongodb");

let token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImRlbGxhQG1haWwuY29tIiwiaWQiOiI2NDA2NWY4Yzc1MTRhZmQ1YjcyMGNhMjciLCJ1c2VybmFtZSI6ImRlbGxhIiwiaWF0IjoxNjc5OTk3MjQ5fQ.WrvrH9KI9HYxEKs8JRgw6HEqjoOWsYMFJ4EZco5zPZU";
let idNPC = "642453e3380b50cdc2359faa";

const neo4j = require("neo4j-driver");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("./mockApp");

describe("NPC", () => {
  let addedNPCId;
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
    const npcs = db.collection("npcs");
    await npcs.findOneAndDelete({ name: "Test" });
    await session.run(`MATCH (n:NPC {name: $name}) DETACH DELETE n`, {
      name: "Test",
    });
    await session.close();
    await connection.close();
  });
  beforeEach(async () => {
    const npcs = db.collection("npcs");
    await npcs.findOneAndDelete({ name: "Test" });
    await session.run(`MATCH (n:NPC {name: $name}) DETACH DELETE n`, {
      name: "Test",
    });
  });

  require("dotenv").config();

  //-----Create NPC-----
  describe("POST 'NPC/'", () => {
    it("should insert a doc into NPC", async () => {
      const npcs = db.collection("npcs");

      const mockNPC = {
        name: "Test",
        age: 21,
        gender: "Female",
        commentList: ["I'm hungry!"],
        friendly: true,
      };

      const res = await request(app)
        .post("/NPC/")
        .set("Authorization", "Bearer " + token)
        .send(mockNPC)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(200);
      const insertedNPC = await npcs.findOne({
        name: mockNPC.name,
      });
      addedNPCId = insertedNPC.id;
      expect(insertedNPC.name).toEqual(mockNPC.name);
    });
  });

  //-----Get all NPC's-----
  describe("GET All 'NPC/'", () => {
    it("Should get all NPC", async () => {
      const res = await request(app)
        .get("/NPC/")
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  //-----Get NPC-----
  describe("GET BY ID 'NPC/'", () => {
    it("Should get one NPC", async () => {
      const res = await request(app)
        .get("/NPC/" + idNPC.toString())
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(200);
      expect(res.body.name.length).toBeGreaterThan(0);
    });
  });

  //-----Insert Comment-----
  describe("POST 'NPC/'", () => {
    it("should insert a comment into NPC commentList", async () => {
      const npcs = db.collection("npcs");

      const mockNPC = {
        comment: "Help!",
      };

      const res = await request(app)
        .post("/NPC/" + idNPC.toString())
        .set("Authorization", "Bearer " + token)
        .send(mockNPC)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(200);
      const insertedNPC = await npcs.findOne({
        name: "Amber",
      });
      expect(insertedNPC.commentList).not.toContain(mockNPC.commentList);
    });
  });

  //-----Update NPC-----
  describe("UPDATE BY ID 'NPC/'", () => {
    it("Should update one NPC", async () => {
      const npcs = db.collection("npcs");

      const npc = await npcs.findOne({
        _id: mongoose.Types.ObjectId(idNPC),
      });

      const updateNPC = {
        age: 500,
      };

      const res = await request(app)
        .patch("/NPC/" + idNPC.toString())
        .set("Authorization", "Bearer " + token)
        .send(updateNPC)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(200);
      const updatedNPC = await npcs.findOne({
        _id: mongoose.Types.ObjectId(idNPC),
      });

      let updatedNPCBack = {
        $set: {
          age: 20,
        },
      };

      const options = { new: true };
      const updatedBack = await npcs.findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(idNPC) },
        updatedNPCBack,
        options
      );
      expect(npc.age).not.toEqual(updatedNPC.age);
      expect(npc.age).not.toEqual(updatedBack.value.age);
    });
  });
  //-----Delete NPC-----
  describe("DELETE 'NPC/'", () => {
    it("should delete a NPC", async () => {
      const npcs = db.collection("npcs");

      const mockNPC = {
        name: "Test",
        age: 21,
        gender: "Female",
        commentList: ["I'm hungry!"],
        friendly: true,
      };


      const inserted = await request(app)
        .post("/NPC/")
        .set("Authorization", "Bearer " + token)
        .send(mockNPC)
        .set("Content-Type", "application/json");
      const insertedNPC = await npcs.findOne({
        name: mockNPC.name,
      });
      addedNPCId = insertedNPC._id;

      const res = await request(app)
        .delete("/NPC/" + addedNPCId.toString())
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(200);


    });
  });

  //-----Create relation between a NPC and region-----
});
