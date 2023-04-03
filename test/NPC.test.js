const { MongoClient } = require("mongodb");

let token;
let idNPC = "642453e3380b50cdc2359faa";

const tests = [
  {
    age: 21,
    gender: "Female",
    commentList: ["I'm hungry!"],
    friendly: true,
  },
  {
    name: "Test",
    gender: "Female",
    commentList: ["I'm hungry!"],
    friendly: true,
  },

  {
    name: "Test",
    age: 21,
    gender: "Female",
    commentList: ["I'm hungry!"],
  },
];
let wierdId = "1";
let id = "6422df288c3dbe78ca8e0df4";

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
    session = driver.session({database:process.env.NEO4J_DATABASE_NAME});
    const result = await request(app)
      .post("/Trainer/Login")
      .send({ email: "della@mail.com", password: "Wachtwoord" })
      .set("Content-Type", "application/json");
    token = result.body.accessToken;
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

  //-----DOES NOT Create NPC-----
  describe("POST 'NPC/'", () => {
    for (let i = 0; i < tests.length; i++) {
      it("should not insert a doc into NPC", async () => {
        const res = await request(app)
          .post("/NPC/")
          .set("Authorization", "Bearer " + token)
          .send(tests[i])
          .set("Content-Type", "application/json");
        expect(res.statusCode).toBe(400);
      });
    }
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

  //-----DOES NOT Get NPC-----
  describe("GET BY ID 'NPC/'", () => {
    it("Should not get one NPC", async () => {
      const res = await request(app)
        .get("/NPC/" + wierdId.toString())
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toEqual("Could not find this NPC with id: " + wierdId)
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
        .post("/NPC/" + idNPC.toString() + "/comment")
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

  //-----DOES NOT Insert Comment-----
  describe("POST 'NPC/'", () => {
    it("should not insert a comment into NPC commentList", async () => {
      const npcs = db.collection("npcs");

      const mockNPC = {
        comment: "Help!",
      };

      const res = await request(app)
        .post("/NPC/" + id.toString() + "/comment")
        .set("Authorization", "Bearer " + token)
        .send(mockNPC)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(400);
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

  //-----DOES NOT Update NPC-----
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
        .send(updateNPC)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toEqual("authorization missing");
      const updatedNPC = await npcs.findOne({
        _id: mongoose.Types.ObjectId(idNPC),
      });
      expect(npc.age).toEqual(updatedNPC.age);
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

  //-----DOES NOT Delete NPC-----
  describe("DELETE 'NPC/'", () => {
    it("should not delete a NPC", async () => {
      const res = await request(app)
        .delete("/NPC/" + wierdId.toString())
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(400);
    });
  });
});
