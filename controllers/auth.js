const pool = require('../db/db')
const jwt = require('jsonwebtoken')

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
   
    const query = 'SELECT * FROM users WHERE email = $1 and password = $2';
    const result = await pool.query(query, [email,password]);

        if (!result.rows) {
          res.status(404).json({
            message: "Користувача не знайдено",
          });
        }else {
            const token = jwt.sign(
                {
                  id: result.rows[0].id,
                },
                process.env.JWT_SECRET,
                {
                  expiresIn: "30d",
                }
              );
          
         res.json({
              user:result.rows[0],token
          })
        }



  } 
  
  catch (error) {
   
console.log(error);

  }
};
const getMe = async (req, res) => {

  try {
   
    const user = await pool.query(`select * from users where id = ${req.user.id}`)

    res.status(200).json({ ...user.rows[0] });
    if (!user) {
      return res.status(404).json({
        message: "Користувача не знайдено",
      });
    }
  } catch (error) {
    res.status(500).json({
      alert:"Invalid",
      message: "Немає доступу!!!!!!!!",
    });
  }
};

const getOtpCode = async (req, res) => {
  const { KOD_OS } = req.body;
  console.log(KOD_OS);
  try {
    const connection = await oracledb.getConnection(pool);
    const userOTP = await connection.execute(
      `SELECT * from ictdat.zapauth where KOD_OS = ${KOD_OS}`
    );
    if (userOTP) {
      res.status(200).json(userOTP);
    }
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  login,
  getMe,

};
