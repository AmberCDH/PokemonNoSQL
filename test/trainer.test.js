const { MongoClient } = require("mongodb");
const authenticateToken = require("../TokenService/Auth");

let token;
let id = "64065f8c7514afd5b720ca27";
let addedTrainerId;

const tests = [
  {
    password: "Wachtwoord",
    email: "xella@mail.com",
    region: {
      regionName: "Hoenn",
      route: 12,
      champion: "Wallace",
    },
  },
  {
    username: "Xella",
    password: "Wachtwoord",
    region: {
      regionName: "Hoenn",
      route: 12,
      champion: "Wallace",
    },
  },
  {
    username: "Xella",
    password: "Wachtwoord",
    email: "xella@mail.com",
    region: {
      route: 12,
      champion: "Wallace",
    },
  },
  {
    username: "Xella",
    password: "Wachtwoord",
    email: "xella@mail.com",
    region: {
      regionName: "Hoenn",
      champion: "Wallace",
    },
  },
];
const wierdLogin = [{ email: "a@mail.com", password: "Wachtwoord" }];
const wierdLogin3 = [{ email: "della@mail.com", password: "Wachtwoord1" }];
const wierdLogin2 = [{ password: "Wachtwoord" }, { email: "a@mail.com" }];

let wierdId = "1";
let notYoursId = "63ef9146894401b3a4ed4f26";

let deleteToken;

const neo4j = require("neo4j-driver");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("./mockApp");

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
    const result = await request(app)
      .post("/Trainer/Login")
      .send({ email: "della@mail.com", password: "Wachtwoord" })
      .set("Content-Type", "application/json");
    token = result.body.accessToken;
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

  //-----DOES NOT Register Trainer-----
  describe("POST 'Trainer/'", () => {
    for (let i = 0; i < tests.length; i++) {
      it("should not insert a doc into Trainers", async () => {
        const res = await request(app)
          .post("/Trainer/")
          .send(tests[i])
          .set("Content-Type", "application/json");
        expect(res.statusCode).toBe(400);
      });
    }
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

  //-----DOES NOT Get Trainer-----
  describe("GET BY ID 'Trainer/'", () => {
    it("Should not get one Trainers", async () => {
      const res = await request(app).get("/Trainer/" + wierdId.toString());
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toEqual("authorization missing");
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

  //-----DOES NOT Update Trainer-----
  describe("UPDATE BY ID 'Trainer/'", () => {
    it("Should not update one trainer", async () => {
      const trainers = db.collection("trainers");
      const trainer = await trainers.findOne({
        _id: mongoose.Types.ObjectId(notYoursId),
      });
      const updateTrainer = {
        region: {
          regionName: "Hoenn",
          route: 20,
          champion: "Wallace",
        },
      };

      const res = await request(app)
        .patch("/Trainer/" + notYoursId.toString())
        .set("Authorization", "Bearer " + token)
        .send(updateTrainer)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toEqual("Not authorized >_<");

      const updatedTrainer = await trainers.findOne({
        _id: mongoose.Types.ObjectId(id),
      });
      expect(trainer.region.route).toEqual(updatedTrainer.region.route);
    });
  });

  //-----Login Trainer-----
  describe("POST LOGIN 'Trainer/'", () => {
    it("should login a trainer", async () => {
      const login = { email: "della@mail.com", password: "Wachtwoord" };
      const res = await request(app)
        .post("/Trainer/Login")
        .send(login)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(200);
    });
  });
  //-----DOES NOT Login Trainer-----
  describe("POST LOGIN 'Trainer/'", () => {
    for (let i = 0; i < wierdLogin.length; i++) {
      it("should not login a trainer", async () => {
        const res = await request(app)
          .post("/Trainer/Login")
          .send(wierdLogin[i])
          .set("Content-Type", "application/json");
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toEqual("Login not successful");
      });
    }
  });
  //-----DOES NOT Login Trainer-----
  describe("POST LOGIN 'Trainer/'", () => {
    for (let i = 0; i < wierdLogin3.length; i++) {
      it("should not login a trainer", async () => {
        const res = await request(app)
          .post("/Trainer/Login")
          .send(wierdLogin3[i])
          .set("Content-Type", "application/json");
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toEqual("Login not successful");
      });
    }
  });
  //-----DOES NOT Login Trainer-----
  describe("POST LOGIN 'Trainer/'", () => {
    for (let i = 0; i < wierdLogin2.length; i++) {
      it("should not login a trainer", async () => {
        const res = await request(app)
          .post("/Trainer/Login")
          .send(wierdLogin2[i])
          .set("Content-Type", "application/json");
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toEqual("Email or Password not present");
      });
    }
  });

  //-----Trainer can see friends of friends-----
  describe("GET 'Trainer/'", () => {
    it("should get friends of friends", async () => {
      const res = await request(app)
        .get("/Trainer/" + id.toString() + "/FriendsOfFriends")
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  //-----Trainer can be deleted-----
  describe("DELETE 'Trainer/'", () => {
    it("should delete a trainer", async () => {
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

      const result = await request(app)
        .post("/Trainer/Login")
        .send({ email: "xella@mail.com", password: "Wachtwoord" })
        .set("Content-Type", "application/json");
      deleteToken = result.body.accessToken;

      const deleted = await request(app)
        .delete("/Trainer/" + insertedTrainer._id)
        .set("Authorization", "Bearer " + deleteToken);
      expect(deleted.statusCode).toBe(200);
      expect(deleted.body.email).toEqual(mockTrainer.email)
    });
  });

  //-----DOES NOT Trainer can be deleted-----
  describe("DELETE 'Trainer/'", () => {
    it("should not delete a trainer", async () => {
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

      const deleted = await request(app)
        .delete("/Trainer/" + insertedTrainer._id)
        .set("Authorization", "Bearer " + token);
      expect(deleted.statusCode).toBe(401);
      expect(deleted.body.message).toEqual("Not authorized >_<")
    });
  });
  //-----DOES NOT Trainer can be deleted-----
  describe("DELETE 'Trainer/'", () => {
    it("should not delete a trainer", async () => {
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

      const deleted = await request(app)
        .delete("/Trainer/" + insertedTrainer._id)
      expect(deleted.statusCode).toBe(401);
      expect(deleted.body.message).toEqual("authorization missing")
    });
  });
});
