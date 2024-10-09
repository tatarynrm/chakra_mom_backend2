require("dotenv").config();
const PORT = process.env.PORT || 8800;
const moment = require("moment");
const pool = require('./db/db')
require("moment/locale/uk");
const { Telegraf, Markup } = require('telegraf');
const express = require("express");
const { Server } = require("socket.io");
const app = express();
const session = require("express-session");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const passport = require('passport');
const crypto = require('crypto');
const server = require("http").createServer(app);
const BOT_TOKEN = '6995039261:AAF-rscqplDFzL8sUXpjNA4poRB1rwjApzA'; // Замініть на ваш реальний токен
const SECRET_KEY = crypto.createHash('sha256').update(BOT_TOKEN).digest();
// Підключення Passport.js
require('./config/passport')(passport);

const authRouter = require('./routes/auth')
const transportationRouter = require('./routes/transportation');
const { default: axios } = require("axios");

// Встановлюємо порт для сервера (за замовчуванням 3000)
const corsConfig = {
  // origin: "http://localhost:3000",
  // origin: "http://carriers.ict.lviv.ua",
  origin: "*",
  methods:["GET","POST"],
  // credentials: true,
}
const io = new Server(server, {
  cors: corsConfig,
});


app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  // cookie:{secure:true}
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(
  cors({
    origin: ["https://carriers.ict.lviv.ua", "http://localhost:3000", "http://localhost:3001","https://logistic-mira.space",'https://www.logistic-mira.space'],
    methods: ["POST", "GET"],
    credentials: true,
  })
);

app.use((req, res, next) => {
  const allowedOrigins = [
    "https://carriers.ict.lviv.ua",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://ictwork.site",
    "https://logistic-mira.space",
    'https://www.logistic-mira.space'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Controll-Allow-Origin", origin);
  }
  res.header("Access-Controll-Allow-Methods", "GET,OPTIONS");
  res.header("Access-Controll-Allow-Headers", "Content-Type,Authorization");
  res.header("Access-Controll-Allow-Credentials", true);
  return next();
});
// Routes
app.use("/auth", authRouter);
app.use("/transportation", transportationRouter);



















// Route to start the authorization process
app.get('/auth/instagram', (req, res) => {
  const clientId = process.env.INSTAGRAM_CLIENT_ID || '1753417965193100';
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'https://api.logistic-mira.space/auth/instagram/callback'; // Переконайтеся, що це правильний URL
  const scope = 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish';

  // Формування URL для авторизації
  const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;

  console.log(authUrl); // Додайте це для перевірки
  res.redirect(authUrl); // Перенаправлення на URL авторизації
});

// Callback route to handle the redirect from Instagram
app.get('/auth/instagram/callback', async (req, res) => {
  const { code } = req.query;
console.log('CODE INST CALLBACK',code);

  if (!code) {
      return res.status(400).send('Authorization code not found');
  }

  try {
      const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', null, {
          params: {
              client_id: process.env.INSTAGRAM_CLIENT_ID,
              client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
              grant_type: 'authorization_code',
              redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
              code,
          },
      });


  console.log('TOKEN RESPONSE INSTAGRAM',tokenResponse);
  
      
      const accessToken = tokenResponse.data.access_token;
      const userId = tokenResponse.data.user_id;


      console.log('ACCESS TOKEN CALBACK',accessToken);
      console.log('ACCESS TOKEN userId',userId);
      
      // Зберегти токен в сесії або в базі даних
      req.session.accessToken = accessToken;
      req.session.userId = userId;

      // Перенаправлення на фронтенд
      res.redirect('https://logistic-mira.space/instagram');
  } catch (error) {
      console.error('Error getting access token:', error.response?.data || error.message);
      res.status(500).send('Error getting access token');
  }
});

// Route to manage Instagram pages
app.get('/manage', async (req, res) => {

  console.log('REQ SESSION USER ID',req.session.userId);
  
  if (!req.session.accessToken) {
      return res.status(401).send('Unauthorized');
  }

  try {
      const userMediaResponse = await axios.get(`https://graph.instagram.com/${req.session.userId}/media`, {
          params: {
              access_token: req.session.accessToken,
          },
      });

      res.json(userMediaResponse.data);
  } catch (error) {
      console.error('Error fetching user media:', error.response?.data || error.message);
      res.status(500).send('Error fetching user media');
  }
});

// Запускаємо сервер на зазначеному порту
app.listen(PORT, () => {
  console.log(`Сервер працює на порту ${PORT}`);
});