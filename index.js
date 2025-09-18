require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Mongodb Config
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.2dlckac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // start wokring from here
    const database = client.db("LibraryManagerDB");
    const booksColl = database.collection("Books");

    app.get("/", (req, res) => {
      res.send("Library Manager Server is Running Well!");
    });

    // book related api's
    app.get("/books", async (req, res) => {
      try {
        console.log(req?.header?.authorization);

        const { email } = req.query;
        let query = {};
        if (email) {
          query.addedBy = email;
        }
        const result = await booksColl.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching books:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.post("/books", async (req, res) => {
      const newBook = req.body;
      const result = await booksColl.insertOne(newBook);
      res.send(result);
    });

    app.put("/books/:book_id", async (req, res) => {
      try {
        const { book_id } = req.params;
        const updatedBook = { ...req.body };
        // Remove _id if it exists
        delete updatedBook._id;
        const query = { _id: new ObjectId(book_id) };
        const updateDoc = { $set: updatedBook };

        const result = await booksColl.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating book:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.delete("/books/:book_id", async (req, res) => {
      try {
        const { book_id } = req.params;

        const query = { _id: new ObjectId(book_id) };
        const result = await booksColl.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Error Deleting book:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Library Manager Server is Running on Port: ${port}`);
});
