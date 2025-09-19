require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const serviceAccount = require("./library-manager-firebase-private-key.json");
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(cors());

// firebase admin config
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Mongodb Config
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.2dlckac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// custom MiddleWar
const verifyFirebaseToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).send("Unauthorized User");
  admin
    .auth()
    .verifyIdToken(token)
    .then((res) => {
      req.headers.authEmail = res.email;
      next();
    })
    .catch((error) => res.status(401).send("Unauthorized User"));
};

const verifyAuthEmail = (req, res, next) => {
  const authEmail = req.headers.authEmail;
  const queryEamil = req?.params?.email || req?.query?.email;

  if (authEmail != queryEamil) return res.status(403).send("Forbidden Error");
  next();
};

async function run() {
  try {
    // start wokring from here
    const database = client.db("LibraryManagerDB");
    const booksColl = database.collection("Books");
    const borrowedColl = database.collection("BorrowedList");
    const categoryColl = database.collection("Categories");

    app.get("/", (req, res) => {
      return res.send("Library Manager Server is Running Well!");
    });

    // book related api's
    app.get("/books", async (req, res) => {
      try {
        const { category } = req.query;
        let query = {};
        if (category) query = { category: category };
        const projection = {
          image: 1,
          name: 1,
          author: 1,
          quantity: 1,
        };
        const result = await booksColl.find(query, { projection }).toArray();
        return res.send(result);
      } catch (error) {
        console.error("Error fetching books:", error);
        return res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/books/popular", async (req, res) => {
      try {
        const projection = {
          image: 1,
          name: 1,
          author: 1,
          quantity: 1,
        };

        const result = await booksColl
          .find({}, { projection })
          .sort({ borrowedCount: -1 })
          .limit(6)
          .toArray();

        return res.send(result);
      } catch (error) {
        console.error("Error fetching popular books:", error);
        return res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/books/:bookId", async (req, res) => {
      try {
        const { bookId } = req.params;
        const query = { _id: new ObjectId(bookId) };
        const result = await booksColl.findOne(query);
        return res.send(result);
      } catch (error) {
        console.error("Error fetching book:", error);
        return res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get(
      "/books/user/:email",
      verifyFirebaseToken,
      verifyAuthEmail,
      async (req, res) => {
        try {
          const { email } = req.params;
          let query = { addedBy: email };
          const result = await booksColl.find(query).toArray();
          return res.send(result);
        } catch (error) {
          console.error("Error fetching books:", error);
          return res.status(500).send({ message: "Internal Server Error" });
        }
      }
    );

    app.post("/books", verifyFirebaseToken, async (req, res) => {
      const newBook = req.body;
      const result = await booksColl.insertOne(newBook);
      return res.send(result);
    });

    app.put("/books/:book_id", verifyFirebaseToken, async (req, res) => {
      try {
        const { book_id } = req.params;
        const authEmail = req.headers.authEmail;
        const query = { _id: new ObjectId(book_id) };
        const book = await booksColl.findOne(query);

        if (authEmail !== book.addedBy)
          return res.status(403).send("Forbiden Acess");

        const updatedBook = { ...req.body };
        // Remove _id if it exists
        delete updatedBook._id;
        const updateDoc = { $set: updatedBook };
        const result = await booksColl.updateOne(query, updateDoc);
        return res.send(result);
      } catch (error) {
        console.error("Error updating book:", error);
        return res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.delete("/books/:book_id", verifyFirebaseToken, async (req, res) => {
      try {
        const { book_id } = req.params;
        const authEmail = req.headers.authEmail;
        const query = { _id: new ObjectId(book_id) };
        const book = await booksColl.findOne(query);
        if (authEmail !== book.addedBy)
          return res.status(403).send("Forbiden Acess");

        const result = await booksColl.deleteOne(query);
        return res.send(result);
      } catch (error) {
        console.error("Error Deleting book:", error);
        return res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // borrowed books related api's
    app.get("/borrowed-list/ids", verifyFirebaseToken, async (req, res) => {
      try {
        const authEmail = req.headers.authEmail;
        const query = { borrowedBy: authEmail };
        const projection = { bookId: 1, _id: 0 };

        const result = await borrowedColl.find(query, { projection }).toArray();

        const bookIds = result.map((item) => item.bookId);

        return res.send(bookIds);
      } catch (error) {
        console.error("Error fetching borrowed list:", error);
        return res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.get("/borrowed-list/books", verifyFirebaseToken, async (req, res) => {
      try {
        const authEmail = req.headers.authEmail;
        const projection = { bookId: 1 };
        const borrowedRecords = await borrowedColl
          .find({ borrowedBy: authEmail }, { projection })
          .toArray();

        if (!borrowedRecords.length) return res.send([]);

        const result = [];

        for (const record of borrowedRecords) {
          // bad way to aggregate
          const book = await booksColl.findOne({
            _id: new ObjectId(record.bookId),
          });
          if (book) {
            // merge borrowedId
            result.push({
              ...book,
              borrowedId: record._id.toString(),
            });
          }
        }

        return res.send(result);
      } catch (error) {
        console.error("Error fetching borrowed books:", error);
        return res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.post("/borrowed-list", verifyFirebaseToken, async (req, res) => {
      try {
        const bookId = req.body.bookId;
        const authEmail = req.headers.authEmail;
        // check book availability
        const book = await booksColl.findOne({ _id: new ObjectId(bookId) });
        if (!book) return res.status(404).send({ message: "Book not found!" });
        if (book.quantity <= 0)
          return res
            .status(400)
            .send({ message: "Book is not available to borrow!" });

        // insert borrowed record
        const result = await borrowedColl.insertOne({
          bookId: bookId,
          borrowedBy: authEmail,
        });

        // decrease quantity if successfully borrowed
        if (result.insertedId) {
          await booksColl.updateOne(
            { _id: new ObjectId(bookId) },
            { $inc: { quantity: -1 }, $inc: { borrowedCount: 1 } }
          );
        }

        return res.send(result);
      } catch (error) {
        console.error("Error borrowing book:", error);
        return res.status(500).send({ message: "Internal Server Error" });
      }
    });

    app.delete(
      "/borrowed-list/return/:borrow_id",
      verifyFirebaseToken,
      async (req, res) => {
        try {
          const { borrow_id } = req.params;
          const authEmail = req.headers.authEmail;

          // find borrow record
          const borrowDoc = await borrowedColl.findOne({
            _id: new ObjectId(borrow_id),
          });
          if (!borrowDoc)
            return res.status(404).send({ message: "Borrow id is invalid!" });

          // check authorization
          if (authEmail !== borrowDoc.borrowedBy)
            return res.status(401).send("Unauthorized User");

          // delete borrowed record
          const result = await borrowedColl.deleteOne({
            _id: new ObjectId(borrow_id),
          });

          if (result.deletedCount > 0) {
            // increase book quantity after return
            await booksColl.updateOne(
              { _id: new ObjectId(borrowDoc.bookId) },
              { $inc: { quantity: 1 } }
            );
          }

          return res.send(result);
        } catch (error) {
          console.error("Error returning book:", error);
          return res.status(500).send({ message: "Internal Server Error" });
        }
      }
    );

    // categories
    app.get("/categories", async (req, res) => {
      try {
        const result = await categoryColl.find().toArray();
        return res.send(result);
      } catch (error) {
        console.log(error);
        return res.status(500).send("Server Error");
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
