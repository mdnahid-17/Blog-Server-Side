const express = require("express");
require("dotenv").config();
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 8000;

// middleware
const corsOptions = {
  origin: ["http://localhost:5173", "https://blog-server-zeta-lovat.vercel.app","https://stay-vista-f35af.web.app"],
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.paptp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access one' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access two' })
    }
    req.user = decoded
    next()
  })
}


async function run() {
  const blogsCollection = client.db("blogs-sites").collection("blogs");
  const commentsCollection = client.db("blogs-sites").collection("comments");
  const wishlistsCollection = client.db("blogs-sites").collection("wishlists");

  try {
    //creating Token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:"7d"
      });

      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    //clearing Token
    app.get("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res.clearCookie("token", { ...cookieOptions, maxAge: 0 }).send({ success: true });
    });

    // get all blogs for db
    app.get("/blogs", async (req, res) => {
      const result = await blogsCollection.find().toArray();
      res.send(result);
    });

    // get a blog id for db
    app.get("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.findOne(query);
      res.send(result);
    });

    // get a comments id for db
    app.get("/comments/:id", async (req, res) => {
      const blogId = req.params.id;
      const query = { blogId: blogId };
      const result = await commentsCollection.find(query).toArray();
      res.send(result);
    });

    // user get a wishlist
    app.get("/wishlists/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await wishlistsCollection.find(query).toArray();
      res.send(result);
    });

    // get Featured Blogs data
    app.get("/featured-blogs", async (req, res) => {
      const query = {
        $expr: { $gt: [{ $strLenCP: "$long_description" }, 110] },
      };
      const result = await blogsCollection.find(query).toArray();
      res.send(result);
    });

    // get all Blogs data
    app.get("/all-blogs", async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page) - 1;
      // console.log(size, page);
      let query = {
        title: { $regex: search, $options: "i" },
      };
      if (filter) query.category = filter;
      let options = {};
      const result = await blogsCollection
        .find(query, options)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });
    // Get all jobs data count from db
    app.get("/blogs-count", async (req, res) => {
      const filter = req.query.category;
      const search = req.query.search;

      if (filter) query.category = filter;
      let query = {
        blog_title: { $regex: search, $options: "i" },
      };
      const count = await blogsCollection.countDocuments(query);
      res.send({ count });
    });

    // user save a blog with db
    app.post("/blog",verifyToken, async (req, res) => {
      const blogData = req.body;
      const result = await blogsCollection.insertOne(blogData);
      console.log(result);
      res.send(result);
    });
    // user save a wishlist with db
    app.post("/wishlist",verifyToken, async (req, res) => {
      const wishlistsData = req.body;
      const result = await wishlistsCollection.insertOne(wishlistsData);
      console.log(result);
      res.send(result);
    });
    // save a comments
    app.post("/comment", async (req, res) => {
      const commentData = req.body;
      const result = await commentsCollection.insertOne(commentData);
      res.send(result);
    });

    // edit a blog
    app.put("/blogs/:id",verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);
        const blogsData = req.body;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: blogsData,
        };
        const option = { upsert: false };
        const result = await blogsCollection.updateOne(query, updateDoc, option);
        res.send(result);
      } catch (error) {
        res.send(error.message);
      }
    });

    // delete wishlist
    app.delete("/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistsCollection.deleteOne(query);
      res.send(result);
      // console.log(query);
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello from Blog website Server..");
});

app.listen(port, () => {
  console.log(`Blog website is running on port ${port}`);
});
