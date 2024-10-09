const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/db');
const {
  login,
  getMe,

} = require("../controllers/auth");
const checkAuth = require("../middleware/checkAuth");

const router = express.Router();

// Реєстрація користувача
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Перевірка наявності користувача
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      return res.status(400).json({ msg: 'Користувач з таким email вже існує' });
    }

    // Хешування пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Створення нового користувача
    await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3)',
      [name, email, hashedPassword]
    );

    res.json({ msg: 'Користувач зареєстрований' });
  } catch (err) {
    res.status(500).json({ msg: 'Помилка сервера' });
  }
});

// Логін користувача через email і пароль
router.post('/login', (req, res, next) => {

  
  passport.authenticate('local', { session: false }, (err, userInfo, info) => {
  
    
    if (err || !userInfo) {
      return res.status(400).json({ msg: info?.message });
    }
    if (info?.code === 404) {
      res.json({
        msg:"Створіть новий пароль",
        code:501
      })
    }

    const {user,token} = userInfo;


    
    return res.json({ token,user });
  })(req, res, next);
});

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', {
  failureRedirect: '/login',
  session: false,
}), (req, res) => {
  const { user ,token} = req.user;
  res.redirect(`https:/logistic-mira.space/?token=${token}&id=${user.id}&email=${user.email}&name=${user.name}&google_id=${user.google_id}`);
  console.log('1');
  
  
});



router.route("/me").get(checkAuth,getMe);

module.exports = router;
