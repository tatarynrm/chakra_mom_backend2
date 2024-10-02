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
const transportationRouter = require('./routes/transportation')

// Встановлюємо порт для сервера (за замовчуванням 3000)
const corsConfig = {
  // origin: "http://localhost:3000",
  // origin: "http://carriers.ict.lviv.ua",
  origin: "*",
  methods:["GET","POST"],
  credentials: true,
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
  cookie:{secure:false}
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(
  cors({
    origin: ["https://carriers.ict.lviv.ua", "http://localhost:3000", "http://localhost:3001","https://logistic-mira.space"],
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
    "https://logistic-mira.space"
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




// Запускаємо сервер на зазначеному порту
app.listen(PORT, () => {
  console.log(`Сервер працює на порту ${PORT}`);
});