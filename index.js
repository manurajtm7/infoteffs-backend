const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

const mongoose = require("mongoose");
const UserDoc = require("./model/User");
const PostDoc = require("./model/Post");
const upload = multer({ dest: "./uploads" });
app.use(cors());
app.use(express.json());
app.use(upload.any());

mongoose.connect(process.env.CONNECTION_STR);

const jwtKey = process.env.jwtKey;
cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

const PORT = 4000 || process.env.PORT;

app.post("/Register", async (req, res) => {
  const { name, email, password } = req.body;
  const filePath = req.files[0];

  try {
    const imageUrl = await cloudinary.uploader.upload(filePath.path);

    await UserDoc.create({ name, email, password, image: imageUrl.url });
    const authKey = jwt.sign({ name, email, password }, jwtKey);
    res.json(authKey).status(200);
  } catch (e) {
    res.status(400);
  }
});

//login

app.post("/Login", async (req, res) => {
  const { email, password } = req.body;
  const userLog = await UserDoc.findOne({ email, password });

  if (userLog) {
    const authKey = jwt.sign({ email, password }, jwtKey);
    res.json({ authKey, userId: userLog._id }).status(200);
  } else {
    res.status(400).json(0);
  }
});

//delete route

app.get("/Delete", async (req, res) => {
  res.json(await UserDoc.find({}));
});

//post create route
app.post("/Create", async (req, res) => {
  const { postName, content, authKey, userId } = req.body;
  const filePath = req.files[0];

  try {
    let imageUrl = null;
    if (filePath) imageUrl = await cloudinary.uploader.upload(filePath?.path);

    const verified = jwt.verify(authKey, jwtKey);
    if (!!verified) {
      const PostData = await PostDoc.create({
        postName,
        content,
        image: imageUrl && imageUrl?.url,
        user: userId,
      });
      res.json(PostData).status(200);
    }
  } catch (e) {
    console.log(e);
    res.status(400);
  }
});
app.get("/", async (req, res) => {
  try {
    const postData = await PostDoc.find({})
      .populate({
        path: "user",
        select: "name email image ",
      })
      .sort({ date: -1 });
    res.json(postData).status(200);
  } catch (e) {
    console.log(e);
    res.status(400);
  }
});

app.post("/like", async (req, res) => {
  const data = req.body;
  let response;
  if (!data.likeState) {
    response = await PostDoc.findByIdAndUpdate(
      { _id: data.postId },
      { $inc: { like: 1 } },
      { new: true }
    );
  } else {
    response = await PostDoc.findByIdAndUpdate(
      { _id: data.postId },
      { $inc: { like: -1 } },
      { new: true }
    );
  }
  res.json(response);
});

app.listen(PORT, () => {
  console.log("connected to server");
});
