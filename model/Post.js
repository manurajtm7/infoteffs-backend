const mongoose = require("mongoose");
const { required } = require("nodemon/lib/config");

const postSchema = new mongoose.Schema({
  postName: { type: String, min: 3, required: true },
  content: { type: String, min: 3 },
  image: { type: String, min: 3 },
  like: { type: Number, default: 0 },
  likes: [{ type: String }],
  user: { type: mongoose.Schema.ObjectId, ref: "user" },
  date: { type: Date, default: Date.now() },
});

const PostDoc = mongoose.model("informations", postSchema);

module.exports = PostDoc;
