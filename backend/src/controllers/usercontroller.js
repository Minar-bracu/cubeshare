const user = require('../models/user');
const bcrypt = require('bcrypt');
const joi = require('joi');
const auth = require('./authController');

const registerSchema = joi.object({
  username: joi.string().alphanum().min(3).max(30).required(),
  password: joi.string().min(6).max(100).required()
});

async function register(req, res) {
  const { username, password } = req.body;
  const { error } = registerSchema.validate({ username, password });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    await user.createUser(username, password);
    // automatically login
    return await login(req, res);
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    return res.status(500).json({ error: err.message });
  }
}

async function login(req, res) {
  const { username, password } = req.body;
  try {
    const userData = await user.getUserByUsername(username);
    if (!userData) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = auth.generateToken({ id: userData.id, username: userData.username });
    res.json({ token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  register,
  login
};