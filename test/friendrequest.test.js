const { MongoClient } = require("mongodb");

let token;

let requestFriend 

const neo4j = require("neo4j-driver");
const request = require("supertest");
const app = require("./mockApp");

describe("RequestFriendship", () => {
  let connection;
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
    await session.close();
    await connection.close();
  });
  beforeEach(async () => {});

  require("dotenv").config();

  //-----create friendshiprequest-----
  describe("POST 'Request/'", () => {
    it("Should post request", async () => {
      const mockRequest = {
        receiver: "64065f8c7514afd5b720ca27",
        sender: "63ef7dd7ae1b615054ac301a",
      };

      const res = await request(app)
        .post("/Request/")
        .set("Authorization", "Bearer " + token)
        .send(mockRequest)
        .set("Content-Type", "application/json");
      expect(res.statusCode).toBe(200);
      requestFriend = res.body;
    });
  });

  //-----delete one friendshiprequest-----
  describe("DELETE 'Request/'", () => {
    it("should delete a Request", async () => {
      const res = await request(app)
        .delete("/Request/" + requestFriend._id.toString())
        .set("Authorization", "Bearer " + token);
      expect(res.statusCode).toBe(200);
    });
  });
});
