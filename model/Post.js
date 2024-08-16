const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  postName: { type: String, required: true, min: 3 },
  content: { type: String, required: true, min: 3 },
  image: { type: String, required: false, min: 3 },
  like: { type: Number, default: 0 },
  user: { type: mongoose.Schema.ObjectId, ref: "user" },
  date: { type: Date, default: Date.now() },
});

const PostDoc = mongoose.model("informations", postSchema);

module.exports = PostDoc;
