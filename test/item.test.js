const { MongoClient } = require("mongodb");

let token;
let idItem = "6422df288c3dbe78ca8e0df4";

const neo4j = require("neo4j-driver");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("./mockApp");

const tests = [
  {
    effect: "Increases Special Attack EVs by 10.",
    category: "Medical Item",
    amount: 20,
  },
  {
    name: "Test",
    category: "Medical Item",
    amount: 20,
  },
  {
    name: "Test",
    effect: "Increases Special Attack EVs by 10.",
    amount: 20,
  },
  {
    name: "Test",
    effect: "Increases Special Attack EVs by 10.",
    category: "Medical Item",
  },
];
let wierdId = "1";
let notYoursId = "63ff891965a2bc42429dff31";

let addedItemId;
describe("Item", () => {
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
    const result = await request(app)
      .post("/Trainer/Login")
      .send({ email: "della@mail.com", password: "Wachtwoord" })
      .set("Content-Type", "application/json");
    token = result.body.accessToken;
  });
  afterAll(async () => {
    const items = db.collection("items");
    await items.findOneAndDelete({ _id: addedItemId, name: "Test" });
    await session.run(`MATCH (n:Item {name: $name}) DETACH DELETE n`, {
      name: "Test",
    });
    await session.close();
    await connection.close();
  });
  beforeEach(async () => {
    const items = db.collection("items");
    await items.findOneAndDelete({ name: "Test" });
    await session.run(`MATCH (n:Item {name: $name}) DETACH DELETE n`, {
      name: "Test",
    });
  });

  require("dotenv").config();

  //-----Is not logged in-----
  describe("POST 'Item/'", () => {
    for (let i = 0; i < tests.length; i++) {
      it("should not be logged in", async () => {
        const res = await request(app)
          .post("/Item/")
          .send(tests[i])
          .set("Content-Type", "application/json");
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toEqual("authorization missing")
      });
    }
  });

  //-----Create Item-----
  describe("POST 'Item/'", () => {
    it("should insert a doc into items", async () => {
      const items = db.collection("items");

      const mockItem = {
        name: "Test",
        effect: "Increases Special Attack EVs by 10.",
        category: "Medical Item",
        amount: 20,
      };

      const res = await request(app)
        .post("/Item/")
        .set("Authorization", "Bearer " + token)
        .send(mockItem)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(200);
      const insertedItem = await items.findOne({
        name: mockItem.name,
      });
      addedItemId = insertedItem.id;
      expect(insertedItem.name).toEqual(mockItem.name);
    });
  });

  //-----DOES NOT Create Item-----
  describe("POST 'Item/'", () => {
    for (let i = 0; i < tests.length; i++) {
      it("should not insert a doc into items", async () => {
        const res = await request(app)
          .post("/Item/")
          .set("Authorization", "Bearer " + token)
          .send(tests[i])
          .set("Content-Type", "application/json");
        expect(res.statusCode).toBe(400);
      });
    }
  });

  //-----Get All items-----
  describe("GET All 'Item/'", () => {
    it("Should get all items", async () => {
      const res = await request(app)
        .get("/Item/")
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  //-----Get item-----
  describe("GET BY ID 'Item/'", () => {
    it("Should get one item", async () => {
      const res = await request(app)
        .get("/Item/" + idItem.toString())
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(200);
      expect(res.body.name.length).toBeGreaterThan(0);
    });
  });

  //-----DOES NOT Get item-----
  describe("GET BY ID 'Item/'", () => {
    it("Should not get one item", async () => {
      const res = await request(app)
        .get("/Item/" + wierdId.toString())
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toEqual(
        "Could not find this item with id: " + wierdId
      );
    });
  });

  //-----Update item-----
  describe("UPDATE BY ID 'Item/'", () => {
    it("Should update one item", async () => {
      const items = db.collection("items");

      const item = await items.findOne({
        _id: mongoose.Types.ObjectId(idItem),
      });

      const updateItem = {
        amount: 500,
      };

      const res = await request(app)
        .patch("/Item/" + idItem.toString())
        .set("Authorization", "Bearer " + token)
        .send(updateItem)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(200);

      const updatedItem = await items.findOne({
        _id: mongoose.Types.ObjectId(idItem),
      });

      let updatedItemBack = {
        $set: {
          amount: 20,
        },
      };

      const options = { new: true };
      const updatedBack = await items.findOneAndUpdate(
        { _id: mongoose.Types.ObjectId(idItem) },
        updatedItemBack,
        options
      );

      expect(item.amount).not.toEqual(updatedItem.amount);
      expect(item.amount).not.toEqual(updatedBack.value.amount);
    });
  });

  //-----DOES NOT Update item-----
  describe("UPDATE BY ID 'Item/'", () => {
    it("Should not update one item", async () => {
      const items = db.collection("items");

      const item = await items.findOne({
        _id: mongoose.Types.ObjectId(idItem),
      });

      const updateItem = {
        amount: 500,
      };

      const res = await request(app)
        .patch("/Item/" + notYoursId.toString())
        .set("Authorization", "Bearer " + token)
        .send(updateItem)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toEqual("Not authorized >_<")

      const updatedItem = await items.findOne({
        _id: mongoose.Types.ObjectId(idItem),
      });

      expect(item.amount).toEqual(updatedItem.amount);
    });
  });

  //-----Delete item-----
  describe("DELETE 'Item/'", () => {
    it("should delete a item", async () => {
      const items = db.collection("items");

      const mockItem = {
        name: "Test",
        effect: "Increases Special Attack EVs by 10.",
        category: "Medical Item",
        amount: 20,
      };

      const inserted = await request(app)
        .post("/Item/")
        .set("Authorization", "Bearer " + token)
        .send(mockItem)
        .set("Content-Type", "application/json");
      const insertedItem = await items.findOne({
        name: mockItem.name,
      });
      addedItemId = insertedItem._id;

      const res = await request(app)
        .delete("/Item/" + addedItemId.toString())
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(200);
    });
  });

  //-----DOES NOT Delete item-----
  describe("DELETE 'Item/'", () => {
    it("should not delete a item", async () => {
      const res = await request(app)
        .delete("/Item/" + notYoursId.toString())
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toEqual("Not authorized >_<")
    });
  });
});
