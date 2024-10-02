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
const { useFilterTags } = require("./utils/TagFilter");
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

app.post("/Register", async (req, res) => {
  const { name, email, password } = req.body;
  const filePath = req.files[0];

  try {
    const imageUrl = await cloudinary.uploader.upload(filePath.path);

    const userData = await UserDoc.create({
      name,
      email,
      password,
      image: imageUrl.url,
    });
    const authKey = jwt.sign({ name, email, password }, jwtKey);
    res.json({ authKey, userId: userData._id }).status(200);
  } catch (e) {
    res.status(400);
  }
});

//login

app.post("/Login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const userLog = await UserDoc.findOne({ email, password });

    if (userLog) {
      const authKey = jwt.sign({ email, password }, jwtKey);
      res.json({ authKey, userId: userLog._id }).status(200);
    } else {
      res.status(400).json(0);
    }
  } catch (err) {
    res.status(501).json(0);
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
      if (PostData) res.json(PostData).status(200);
      else throw new Error("Error while adding posting");
    }
  } catch (e) {
    console.log(e);
    res.status(500);
  }
});

app.delete("/user/post/delete", async (req, res) => {
  const { postId, authKey, userId } = req.body;

  const verified = jwt.verify(authKey, jwtKey);
  if (!!verified) {
    try {
      const post = await PostDoc.findById({
        _id: new mongoose.Types.ObjectId(postId),
      });

      if (post.image) {
        let public_id = post.image.split("/").at(-1).split(".")[0];
        cloudinary.uploader.destroy(public_id, (err, res) => {
          if (err) console.log(err);
          else console.log(res);
        });
      }

      const response = await PostDoc.findOneAndDelete({
        _id: postId,
      });

      if (response) res.json("successfully deleted a post");
      else throw new Error("Error while deleting post");
    } catch (e) {
      console.log(e);
      res.sendStatus(400);
    }
  } else res.sendStatus(400);
});

app.post("/user/account", async (req, res) => {
  const { authKey, userId } = req.body;

  try {
    const verified = jwt.verify(authKey, jwtKey);

    if (!!verified) {
      const userDetail = await UserDoc.findById({
        _id: new mongoose.Types.ObjectId(userId),
      });

      const posts = await PostDoc.find({
        user: new mongoose.Types.ObjectId(userId),
      }).sort({ date: -1 });

      if (userDetail) {
        res.json({
          userDetail,
          posts,
        });
      }
    } else res.sendStatus(400);
  } catch (err) {
    console.log(err);
    res.sendStatus(401);
  }
});

app.put("/user/update", async (req, res) => {
  const { name, tag, userId } = req.body;

  try {
    const response = await UserDoc.findByIdAndUpdate(
      { _id: new mongoose.Types.ObjectId(userId) },
      { name, tags: tag }
    );

    if (response) {
      res.status(200).json({ message: "User detail updated successfully" });
    } else throw new Error("Error while updaing user details");
  } catch (err) {
    console.log(err);

    res.status(500).json({ message: "Error while updating the user details" });
  }
});

app.put("/user/update/profile", async (req, res) => {
  const image = req.files[0];
  const { user_id, auth_key } = req.body;

  if (!image) res.status(404).json("Image not found");

  try {
    if (jwt.verify(auth_key, jwtKey)) {
      const preResponse = await UserDoc.findById({
        _id: new mongoose.Types.ObjectId(user_id),
      });

      if (preResponse.image) {
        let public_id = preResponse.image.split("/").at(-1).split(".")[0];
        cloudinary.uploader.destroy(public_id, (err, res) => {
          if (err) {
            console.log(err);
          } else console.log("deleted successfully", res);
        });
      }

      const uploadImage = await cloudinary.uploader.upload(image?.path);
      const profileUpdate = await UserDoc.findByIdAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(user_id),
        },
        {
          image: uploadImage.url,
        }
      );

      res.status(200).json({ message: "profile updated successfully" });
    }
  } catch (Err) {
    console.log(Err);

    res.status(500).json("Error" + Err);
  }
});

app.get("/user/feed", async (req, res) => {
  const { userId } = req.body;
  try {
    const { tags } = await UserDoc.findOne({
      _id: new mongoose.Types.ObjectId(userId),
    });

    const FormattedUserTags = useFilterTags(tags);

    const posts = await PostDoc.find({})
      .populate({
        path: "user",
        select: "name email image tags ",
      })
      .sort({ date: -1 });

    // const personalizedPosts = posts.filter((post) => {
    //   const filteredData = useFilterTags(post?.user?.tags);
    //   console.log(" ---- ----- ----" , filteredData);

    //   // const formattedPostTags = filteredData.filter((tags) => {
    //   //   return
    //   // })

    //   return filteredData;
    // });

    console.log(personalizedPosts);
    res.status(200);
  } catch (err) {
    console.log(err);
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

//! currently working

app.post("/like", async (req, res) => {
  const { postId, likeState, userId } = req.body;

  try {
    let response;

    if (!likeState) {
      response = await PostDoc.findByIdAndUpdate(
        { _id: new mongoose.Types.ObjectId(postId) },
        { $push: { likes: userId } },
        { new: true }
      );
    } else {
      response = await PostDoc.findByIdAndUpdate(
        { _id: new mongoose.Types.ObjectId(postId) },
        { $pull: { likes: userId } }
      );
    }
    res.json(response).status(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("connected to server");
});
