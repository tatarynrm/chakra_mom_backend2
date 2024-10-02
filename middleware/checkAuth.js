const jwt = require("jsonwebtoken");

module.exports = async function (req, res, next) {
  const token = (req.headers.authorization || "").replace(/Bearer\s?/, "");

  if (!token) {
    return res.status(401).json({ message: 'Токен не надано' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Невірний токен' });
    }
console.log('DECODED',decoded);

    req.user = decoded; // Зберігаємо інформацію про користувача у запиті
    next(); // Продовжуємо до наступного middleware або обробника маршруту
  });
};
