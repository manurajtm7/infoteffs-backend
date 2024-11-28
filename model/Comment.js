const mongoose = require("mongoose");
const { required } = require("nodemon/lib/config");

const CommentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "informations" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    comment: { type: String, required: true },
  },
  {
    timestamps: true,
    
  }
);

const CommentModel = mongoose.model("comments", CommentSchema);

module.exports = CommentModel;
