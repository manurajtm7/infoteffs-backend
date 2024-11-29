const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, require: true, min: 3, uinque: true },
  email: {
    type: String,
    required: true,
    uinque: true,
    min: 6,
  },
  password: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
  tags: String,
});

const UserDoc = mongoose.model("user", UserSchema);

module.exports = UserDoc;
