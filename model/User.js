const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, require: true, min: 3 },
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
    required: true,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
});

const UserDoc = mongoose.model("user", UserSchema);

module.exports = UserDoc;
