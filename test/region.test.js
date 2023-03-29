const { MongoClient } = require("mongodb");

let token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImRlbGxhQG1haWwuY29tIiwiaWQiOiI2NDA2NWY4Yzc1MTRhZmQ1YjcyMGNhMjciLCJ1c2VybmFtZSI6ImRlbGxhIiwiaWF0IjoxNjc5OTk3MjQ5fQ.WrvrH9KI9HYxEKs8JRgw6HEqjoOWsYMFJ4EZco5zPZU";

const neo4j = require("neo4j-driver");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../app");

describe("Region", () => {
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
    await session.close();
    await connection.close();
  });

  require("dotenv").config();

  //-----get all regions-----
  describe("GET All 'Regions/'", () => {
    it("Should get all Region", async () => {
      const res = await request(app)
        .get("/Region/")
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(200);
    });
  });

  //-----get specific region-----
  describe("GET one 'Regions/'", () => {
    it("Should get one Region", async () => {
      const region = {
        regionName: "Hoenn",
      };
      const res = await request(app)
        .post("/Region/")
        .set("Authorization", "Bearer " + token)
        .send(region)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(200);
    });
  });

  //-----Top trades of a region-----
  describe("GET one 'Regions/'", () => {
    it("Should get one Region", async () => {
      const region = {
        regionName: "Hoenn",
      };
      const res = await request(app)
        .post("/Region/TopTrader")
        .set("Authorization", "Bearer " + token)
        .send(region)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(200);
    });
  });
});
