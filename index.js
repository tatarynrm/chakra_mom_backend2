require("dotenv").config();
const PORT = process.env.PORT || 50000;
const moment = require("moment");
const pool = require("./db/db");
require("moment/locale/uk");
const { Telegraf, Markup } = require("telegraf");
const express = require("express");
const { Server } = require("socket.io");
const app = express();
const session = require("express-session");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const passport = require("passport");
const crypto = require("crypto");
const server = require("http").createServer(app);
const BOT_TOKEN = "6995039261:AAF-rscqplDFzL8sUXpjNA4poRB1rwjApzA"; // Замініть на ваш реальний токен
const SECRET_KEY = crypto.createHash("sha256").update(BOT_TOKEN).digest();
// Підключення Passport.js
require("./config/passport")(passport);

const authRouter = require("./routes/auth");
const transportationRouter = require("./routes/transportation");
const { default: axios } = require("axios");

// Встановлюємо порт для сервера (за замовчуванням 3000)
const corsConfig = {
  // origin: "http://localhost:3000",
  // origin: "http://carriers.ict.lviv.ua",
  origin: "*",
  methods: ["GET", "POST"],
  // credentials: true,
};
const io = new Server(server, {
  cors: corsConfig,
});

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    // cookie:{secure:true}
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(
  cors({
    origin: [
      "https://carriers.ict.lviv.ua",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://logistic-mira.space",
      "https://www.logistic-mira.space",
    ],
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
    "https://www.logistic-mira.space",
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
app.get("/auth/instagram", (req, res) => {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI ||
    "https://api.logistic-mira.space/auth/instagram/callback";
  const scope =
    "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish";

  // Формування URL для авторизації
  const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(scope)}`;

  console.log(authUrl); // Додайте це для перевірки
  res.redirect(authUrl); // Перенаправлення на URL авторизації
});

app.get("/auth/instagram/callback", async (req, res) => {
  const { code } = req.query;
  console.log("CODE INST CALLBACK", code);

  if (!code) {
    return res.status(400).send("Authorization code not found");
  }

  const clientId = process.env.INSTAGRAM_CLIENT_ID?.trim();
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET?.trim();
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI?.trim();

  console.log("Запит на отримання токена з параметрами:");
  console.log({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  try {
    // Використовуємо axios.post замість axios.get
    const tokenResponse = await axios.post(
      "https://api.instagram.com/oauth/access_token",
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      })
    );

    // Обробіть відповідь токена...
    const accessToken = tokenResponse.data.access_token;

    // Отримання повної інформації про користувача
    // Працює!!!!
    const userInfoResponse = await axios.get(`https://graph.instagram.com/me`, {
      params: {
        fields: "id,username,account_type,media_count",
        access_token: accessToken,
      },
    });

console.log('userInfoResponse--------------',userInfoResponse);


    if (accessToken) {
      console.log("ACCESTOKENFORINSTAGRAM", accessToken);
    // Параметри для підписки
    const subscriptionParams = {
      object: 'instagram',
      fields: 'comments,messages',
      callback_url: 'https://your-domain.com/instagram/webhook', // Замість your-domain.com використовуйте ваш домен
      verify_token: process.env.INSTAGRAM_VERIFY_TOKEN,
      access_token: accessToken.trim()
  };


      const response = await axios.post(`https://graph.facebook.com/v21.0/${process.env.INSTAGRAM_CLIENT_ID}/subscriptions`, subscriptionParams);
      console.log('Підписка успішна:', response.data);
      // res.json(response.data); // Відправте дані підписки у відповідь

    }

    res.json(tokenResponse.data); // Відправте дані токена у відповідь
  } catch (error) {
    console.error(
      "Error getting access token:",
      error.response?.data || error.message
    );
    res.status(500).send("Error getting access token");
  }
});
// Route to manage Instagram pages
app.get("/manage", async (req, res) => {
  console.log("REQ SESSION USER ID", req.session.userId);

  if (!req.session.accessToken) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const userMediaResponse = await axios.get(
      `https://graph.instagram.com/${req.session.userId}/media`,
      {
        params: {
          access_token: req.session.accessToken,
        },
      }
    );

    res.json(userMediaResponse.data);
  } catch (error) {
    console.error(
      "Error fetching user media:",
      error.response?.data || error.message
    );
    res.status(500).send("Error fetching user media");
  }
});

// Endpoint для обробки вебхука
app.get('/instagram/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Перевірка верифікаційного токена
  if (mode && token) {
      if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
          console.log('Верифікація пройшла успішно!');
          res.status(200).send(challenge); // Повертаємо значення challenge
      } else {
          res.sendStatus(403); // Повертаємо 403, якщо токен неправильний
      }
  } else {
      res.sendStatus(400); // Повертаємо 400, якщо не передані параметри
  }
});

// Endpoint для обробки подій
app.post('/instagram/webhook', (req, res) => {
  console.log('Отримано подію:', req.body);
  res.sendStatus(200); // Відповідаємо 200, щоб підтвердити отримання події
});










require('dotenv').config();
const WayForPay = require('./adapters/WayForPay.js')





function generateHMAC_MD5(merchantAccount, merchantDomainName, orderReference, orderDate, amount, currency, productNames, productCounts, productPrices, secretKey) {
    // Конкатенація параметрів
    const concatenatedString = [
        merchantAccount,
        merchantDomainName,
        orderReference,
        orderDate,
        amount,
        currency,
        ...productNames,
        ...productCounts,
        ...productPrices
    ].join(';');

    // Генерація HMAC MD5
    const hmac = crypto.createHmac('md5', secretKey);
    hmac.update(concatenatedString, 'utf8');
    
    // Повернення HMAC у шістнадцятковому вигляді
    return hmac.digest('hex');
}


// Функція для генерації HMAC MD5
function generateHMAC_MD5(merchantAccount, merchantDomainName, orderReference, orderDate, amount, currency, productNames, productCounts, productPrices, secretKey) {
  // Конкатенація параметрів
  const concatenatedString = [
      merchantAccount,
      merchantDomainName,
      orderReference,
      orderDate,
      amount,
      currency,
      ...productNames,
      ...productCounts,
      ...productPrices
  ].join(';');

  // Генерація HMAC MD5
  const hmac = crypto.createHmac('md5', secretKey);
  hmac.update(concatenatedString, 'utf8');

  // Повернення HMAC у шістнадцятковому вигляді
  return hmac.digest('hex');
}

// Приклад використання
const merchantAccount = process.env.WAYFORPAY_DOMAIN; // Змінна середовища
const merchantDomainName = 'www.super.org';
const orderReference = '323132121';
const orderDate = 1421412898; // Значення з вашого запиту
const amount = 0.13; // Значення з вашого запиту
const currency = 'UAH'; // Значення з вашого запиту
const productNames = ['Samsung WB1100F', 'Samsung Galaxy Tab 4 7.0 8GB 3G Black'];
const productCounts = [1, 2];
const productPrices = [21.1, 30.99];
const secretKey = process.env.WAYFORPAY_SECRET; // Змінна середовища

const hmacSignature = generateHMAC_MD5(
  merchantAccount,
  merchantDomainName,
  orderReference,
  orderDate,
  amount,
  currency,
  productNames,
  productCounts,
  productPrices,
  secretKey
);

console.log('HMAC MD5 Signature:', hmacSignature);

const getPayMent = async () => {
  const Signature = hmacSignature;
  try {
      const data = await axios.post(process.env.WAYFORPAY_URL, {
          "transactionType": "CHARGE",
          "merchantAccount": merchantAccount, // Взято з параметрів
          "merchantAuthType": "SimpleSignature",
          "merchantDomainName": merchantDomainName, // Взято з параметрів
          "merchantTransactionType": "AUTH",
          "merchantTransactionSecureType": "NON3DS",
          "merchantSignature": Signature,
          "apiVersion": 1,
          "serviceUrl":"http://localhost:8800/wayforpay/callback",
          "orderReference": orderReference, // Взято з параметрів
          "orderDate": orderDate, // Взято з параметрів
          "amount": amount, // Взято з параметрів
          "currency": currency, // Взято з параметрів
          "card": "4111111111111111", // Збережіть безпеку даних картки
          "expMonth": "11",
          "expYear": "2020",
          "cardCvv": "111",
          "cardHolder": "TARAS BULBA",
          "productName": productNames, // Взято з параметрів
          "productPrice": productPrices, // Взято з параметрів
          "productCount": productCounts, // Взято з параметрів
          "clientFirstName": "Bulba",
          "clientLastName": "Taras",
          "clientCountry": "UKR",
          "clientEmail": "rob@mail.com",
          "clientPhone": "380556667788",
          "clientIpAdress": " "
      });

      console.log('ВІДПОВІДЬ ВІД ВЕЙПОРЕ', data);
  } catch (error) {
      console.log(error);
  }
};

// getPayMent();


app.get('/wayforpay/callback',async (req,res) =>{
  try {
    const data = req.body;
    console.log(data);
    
  } catch (error) {
    console.log(error);
    
  }
})











app.post('/shopify/cart-create',async (req,res) =>{
  console.log('dsadsasddsa',req.body);

  
})




// Запускаємо сервер на зазначеному порту
app.listen(PORT, () => {
  console.log(`Сервер працює на порту ${PORT}`);
});
