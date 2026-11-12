'use strict';

const Board_Model = require('../mongoose-models').Board;

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function publicReply(reply) {
  return {
    _id: reply._id,
    text: reply.text,
    created_on: reply.created_on,
  };
}

function publicThread(thread, replies = thread.replies) {
  return {
    _id: thread._id,
    text: thread.text,
    created_on: thread.created_on,
    bumped_on: thread.bumped_on,
    replies: replies.map(publicReply),
    replycount: thread.replies.length,
  };
}

module.exports = function (app) {
  app.route('/api/threads/:board')
    .post(asyncRoute(async (req, res) => {
      const { text, delete_password } = req.body;
      const boardName = req.params.board;
      const date = new Date();
      let board = await Board_Model.findOne({ name: boardName }).exec();

      if (!board) {
        board = new Board_Model({ name: boardName, threads: [] });
      }

      const thread = board.threads.create({
        text,
        delete_password,
        created_on: date,
        bumped_on: date,
        replies: [],
      });
      board.threads.push(thread);
      await board.save();
      res.json({ ...thread.toObject(), board: boardName });
    }))
    .get(asyncRoute(async (req, res) => {
      const board = await Board_Model.findOne({ name: req.params.board }).exec();
      const threads = board ? board.threads : [];
      const mostRecent = threads
        .slice()
        .sort((a, b) => b.bumped_on - a.bumped_on)
        .slice(0, 10)
        .map((thread) => {
          const replies = thread.replies.slice(-3);
          return publicThread(thread, replies);
        });

      res.json(mostRecent);
    }))
    .put(asyncRoute(async (req, res) => {
      const threadId = req.body.thread_id || req.body.report_id;
      const board = await Board_Model.findOne({ name: req.params.board }).exec();
      const thread = board && board.threads.id(threadId);

      if (!thread) {
        return res.status(404).send('Thread not found');
      }

      thread.reported = true;
      await board.save();
      res.send('reported');
    }))
    .delete(asyncRoute(async (req, res) => {
      const { thread_id, delete_password } = req.body;
      const board = await Board_Model.findOne({ name: req.params.board }).exec();
      const thread = board && board.threads.id(thread_id);

      if (!thread) {
        return res.status(404).send('Thread not found');
      }
      if (thread.delete_password !== delete_password) {
        return res.send('incorrect password');
      }

      thread.remove();
      await board.save();
      res.send('success');
    }));

  app.route('/api/replies/:board')
    .post(asyncRoute(async (req, res) => {
      const { thread_id, text, delete_password } = req.body;
      const board = await Board_Model.findOne({ name: req.params.board }).exec();
      const thread = board && board.threads.id(thread_id);

      if (!thread) {
        return res.status(404).send('Thread not found');
      }

      const date = new Date();
      const reply = thread.replies.create({
        text,
        delete_password,
        created_on: date,
        reported: false,
      });
      thread.replies.push(reply);
      thread.bumped_on = date;
      await board.save();
      res.json({ ...reply.toObject(), board: req.params.board });
    }))
    .get(asyncRoute(async (req, res) => {
      const board = await Board_Model.findOne({ name: req.params.board }).exec();
      const thread = board && board.threads.id(req.query.thread_id);

      if (!thread) {
        return res.status(404).send('Thread not found');
      }

      res.json(publicThread(thread));
    }))
    .put(asyncRoute(async (req, res) => {
      const { thread_id, reply_id } = req.body;
      const board = await Board_Model.findOne({ name: req.params.board }).exec();
      const thread = board && board.threads.id(thread_id);
      const reply = thread && thread.replies.id(reply_id);

      if (!reply) {
        return res.status(404).send('Reply not found');
      }

      reply.reported = true;
      await board.save();
      res.send('reported');
    }))
    .delete(asyncRoute(async (req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;
      const board = await Board_Model.findOne({ name: req.params.board }).exec();
      const thread = board && board.threads.id(thread_id);
      const reply = thread && thread.replies.id(reply_id);

      if (!reply) {
        return res.status(404).send('Reply not found');
      }
      if (reply.delete_password !== delete_password) {
        return res.send('incorrect password');
      }

      reply.text = '[deleted]';
      await board.save();
      res.send('success');
    }));
};
