const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const pool = require('../db/db');
const jwt = require('jsonwebtoken');
module.exports = function (passport) {
  // Локальна стратегія для логіну через email і пароль
  passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      // Пошук користувача по email
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = result.rows[0];
  console.log(user);
  
      if (!user) {
        return done(null, false, { message: 'Користувача не знайдено' });
      }
  
      // Перевірка на null для пароля
      if (user.password === null) {
        return done(null, false, { message: 'Невірний пароль'});
      }

      
      // Порівняння паролів
      const isMatch = await bcrypt.compare(password, user.password);
  
      if (!isMatch) {
        return done(null, false, { message: 'Невірний пароль' });
      }
  
      const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
      return done(null, { user, token });
    } catch (err) {
      return done(err);
    }
  }));
  // Стратегія Google OAuth
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Пошук користувача за Google ID
      const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
      let user = result.rows[0];

      if (!user) {
        // Якщо користувача немає, шукаємо за email
        const emailResult = await pool.query('SELECT * FROM users WHERE email = $1', [profile.emails[0].value]);
        user = emailResult.rows[0];

        if (user) {
          // Якщо знайдено, оновлюємо дані користувача
          const updatedUser = await pool.query(
            'UPDATE users SET google_id = $1, name = $2 WHERE email = $3 RETURNING *',
            [profile.id, profile.displayName, profile.emails[0].value]
          );
          user = updatedUser.rows[0];
        } else {
          // Якщо користувача немає, створюємо нового
          const newUser = await pool.query(
            'INSERT INTO users (google_id, name, email) VALUES ($1, $2, $3) RETURNING *',
            [profile.id, profile.displayName, profile.emails[0].value]
          );
          user = newUser.rows[0];
        }
      }

      // Створюємо JWT токен
      const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

      console.log('user', user);
      
      // Повертаємо користувача та токен
      return done(null, { user, token });
    } catch (err) {
      return done(err);
    }
  }));


  

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      done(null, result.rows[0]);
    } catch (err) {
      done(err, null);
    }
  });
};
