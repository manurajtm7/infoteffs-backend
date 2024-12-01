const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const NodeCache = require("node-cache");

require("dotenv").config();

const mongoose = require("mongoose");
const UserDoc = require("./model/User");
const PostDoc = require("./model/Post");
const { useFilterTags } = require("./utils/TagFilter");
const CommentModel = require("./model/Comment");
const upload = multer({ dest: "./uploads" });

const nodeCache = new NodeCache({
  stdTTL: 60,
});

app.use(cors());
app.use(express.json());
app.use(upload.any());

mongoose.connect(process.env.CONNECTION_STR).then(() => {
  console.log("mongodb connected!");
});

const jwtKey = process.env.jwtKey;
cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

app.post("/Register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let imageUrl = null;
    const filePath = req.files[0];

    if (filePath) {
      imageUrl = await cloudinary.uploader.upload(filePath?.path);
    }

    const userData = await UserDoc.create({
      name,
      email,
      password,
      image: imageUrl ? imageUrl?.url : null,
    });

    const authKey = jwt.sign({ name, email, password }, jwtKey);
    res.json({ authKey, userId: userData._id }).status(200);
  } catch (e) {
    console.log(e);
    res.sendStatus(400);
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

  nodeCache.del("posts");

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
  nodeCache.del("posts");

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

//? todo

app.post("/user/profile/:id", async (req, res) => {
  const { authKey, userId } = req.body;
  const findUserId = req.params.id.split(":")[1];

  try {
    const verified = jwt.verify(authKey, jwtKey);

    if (!!verified) {
      const userDetail = await UserDoc.findById({
        _id: new mongoose.Types.ObjectId(findUserId),
      });

      const posts = await PostDoc.find({
        user: new mongoose.Types.ObjectId(userDetail?._id),
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
  nodeCache.del("posts");

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
  nodeCache.del("posts");

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

//! working on feed !
app.post("/user/feeds", async (req, res) => {
  const { userId } = req.body;
  try {
    const userData = await UserDoc.findOne({
      _id: new mongoose.Types.ObjectId(userId),
    });

    if (!userData?.tags) {
      res.status(200);
      return;
    }

    const FormattedUserTags = useFilterTags(userData.tags).join("|");

    const posts = await PostDoc.find({
      $or: [
        {
          content: { $regex: FormattedUserTags, $options: "i" },
        },
        {
          postName: { $regex: FormattedUserTags, $options: "i" },
        },
      ],
    })
      .populate({
        path: "user",
        select: "name email image tags ",
      })
      .sort({ date: -1 });

    res.status(200).json({ feeds: posts });
  } catch (err) {
    console.log(err);
  }
});

// get all the posts

app.get("/", async (req, res) => {
  try {
    let postData;

    if (nodeCache.get("posts")) {
      let dataCachedPosts = nodeCache.get("posts");
      res.json(dataCachedPosts).status(200);
    } else {
      postData = await PostDoc.find({})
        .populate({
          path: "user",
          select: "name email image ",
        })
        .sort({ date: -1 });
      nodeCache.set("posts", postData);
      res.json(postData).status(200);
    }
  } catch (e) {
    console.log(e);
    res.status(400);
  }
});

//! currently working

app.post("/like", async (req, res) => {
  const { postId, likeState, userId, authKey } = req.body;
  nodeCache.del("posts");

  try {
    if (!jwt.verify(authKey, jwtKey)) throw new Error("Authorization failed");

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
    res.sendStatus(401);
  }
});

// user list or peoples

app.post("/peoples", async (req, res) => {
  const { authKey, userId } = req.body;

  try {
    if (jwt.verify(authKey, jwtKey)) {
      const users = await UserDoc.find({}).select("name email image");

      if (users) {
        res.status(200).json({ data: users });
      }
    } else {
      res.status(401).json("unauthorized");
    }
  } catch (err) {
    res.status(500).json({ message: "Error while fetching!" });
  }
});

app.post("/posts/comment/create", async (req, res) => {
  const { authKey, userId, postId, comment } = req.body;
  nodeCache.del("posts");

  try {
    if (jwt.verify(authKey, jwtKey)) {
      const commentCrd = await CommentModel.create({
        postId: new mongoose.Types.ObjectId(postId),
        userId: new mongoose.Types.ObjectId(userId),
        comment,
      });

      if (commentCrd) {
        res.status(200).json({ message: "comment added successfully" });
      } else {
        res.status(400).json({ message: "Error while adding comment" });
      }
    } else throw new Error("User validation failed");
  } catch (err) {
    res.status(401).json({ message: err });
  }
});

app.post("/posts/comment/view", async (req, res) => {
  const { authKey, postId } = req.body;

  try {
    if (jwt.verify(authKey, jwtKey)) {
      const comments = await CommentModel.find({
        postId: new mongoose.Types.ObjectId(postId),
      })
        .populate({
          path: "userId",
          select: "name image",
        })
        .sort({ createdAt: -1 });

      if (comments) {
        res.status(200).json({ data: comments });
      } else {
        res.status(400).json({ message: "Error while fetching comments" });
      }
    } else throw new Error("User validation failed");
  } catch (err) {
    console.log(err);
    res.status(401).json({ message: err });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("connected to server");
});
