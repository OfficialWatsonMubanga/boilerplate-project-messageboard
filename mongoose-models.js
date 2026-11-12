const mongoose = require('mongoose');
const { Schema } = mongoose;

const Reply_Schema = new Schema({
  text: { type: String, required: true },
  delete_password: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false },
});

const Thread_Schema = new Schema({
  text: { type: String, required: true },
  delete_password: { type: String, required: true },
  reported: { type: Boolean, default: false },
  created_on: { type: Date, default: Date.now },
  bumped_on: { type: Date, default: Date.now },
  replies: { type: [Reply_Schema], default: [] },
});

const Board_Schema = new Schema({
  name: { type: String, required: true },
  threads: { type: [Thread_Schema], default: [] },
});

module.exports = {
  Reply: mongoose.model('Reply', Reply_Schema),
  Thread: mongoose.model('Thread', Thread_Schema),
  Board: mongoose.model('Board', Board_Schema),
};
