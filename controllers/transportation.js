const pool = require('../db/db')

const createTransportation = async (req, res) => {
    const {
        cargo_date,
        cost,
        driver,
        location_from,
        price,
        location_to,
        transportation_comment,
        truck,
        truck_owner,
        user_id,
        status,
        cargo_owner
    } = req.body;


    

    // const query = `
    //     INSERT INTO transportation (
    //         cargo_date, cost, driver, location_from, price, location_to, transportation_comment, truck, truck_owner, user_id,status
    //     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)
    //     RETURNING *;
    // `;
    const query = `
WITH inserted_transportation AS (
    INSERT INTO transportation (
        cargo_date, cost, driver, location_from, price, location_to, 
        transportation_comment, truck, truck_owner, user_id, status,cargo_owner
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,$12)
    RETURNING *
)
SELECT 
    it.*, 
    s.status AS transportation_status
FROM inserted_transportation it
LEFT JOIN transportation_status_list s ON it.status = s.id;
    `;
    const values = [
        cargo_date,
        cost,
        driver,
        location_from,
        price,
        location_to,
        transportation_comment,
        truck,
        truck_owner,
        user_id,
        status,
        cargo_owner
    ];

    try {
        const result = await pool.query(query, values);


        if (result.rows.length === 1) {
            return res.status(201).json(result.rows[0]); // Відправка нового запису з HTTP статусом 201
        }

        return res.status(200).json(result.rows); // Якщо вставлено кілька записів
    } catch (err) {
        console.error('Error inserting data:', err);
        return res.status(500).json({ error: 'Error inserting data' }); // Обробка помилок
    }
};
const createTransportationСomment = async (req, res) => {
    const {
        transportation_comment,
        user_id,
        id
    } = req.body;




    const query = `
        UPDATE transportation
        SET transportation_comment = $1
        WHERE id = $2
        RETURNING *;
    `;

    const values = [
        transportation_comment,
        id
    ];

    try {
        const result = await pool.query(query, values);

        if (result.rows.length === 1) {
            return res.status(201).json(result.rows[0]); // Успешное обновление записи
        }

        return res.status(404).json({ error: 'Record not found' }); // Если запись не найдена
    } catch (err) {
        console.error('Error updating data:', err);
        return res.status(500).json({ error: 'Error updating data' }); // Обработка ошибок
    }
};

const getTransportationsList = async (req, res) => {
    const page = parseInt(req.query.page) || 1; // Номер сторінки
    const limit = parseInt(req.query.limit) || 7; // Кількість записів на сторінку
    const offset = (page - 1) * limit; // Зміщення

    try {
        const result = await pool.query(
            `SELECT a.*,b.status as transportation_status
             FROM transportation a
             left join transportation_status_list b   on a.status = b.id
             ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const totalResult = await pool.query(`SELECT COUNT(*) FROM transportation`);
        const totalCount = totalResult.rows[0].count;

        res.json({
            data: result.rows,
            totalCount: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
        });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Error fetching data' });
    }
};
const searchTransportations = async (req, res) => {
    const query = req.query.query;


    
    try {
        const result = await pool.query(
            `SELECT * FROM transportation 
            WHERE location_from ILIKE $1 
               OR location_to ILIKE $1  
               OR cost::text ILIKE $1 
               OR price::text ILIKE $1 
               OR driver ILIKE $1 
               OR truck ILIKE $1 
               OR truck_owner ILIKE $1  
               OR transportation_comment ILIKE $1`,
            [`%${query}%`]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};



const updateTransportation = async (req, res) => {
    const { id } = req.params; // Get the id from req.params
    const {
        cargo_date,
        cost,
        driver,
        location_from,
        price,
        location_to,
        transportation_comment,
        truck,
        truck_owner,
        user_id,
        status,
        cargo_owner
    } = req.body;

    console.log(status);

    const query = `
        UPDATE transportation
        SET
            cargo_date = $1,
            cost = $2,
            driver = $3,
            location_from = $4,
            price = $5,
            location_to = $6,
            transportation_comment = $7,
            truck = $8,
            truck_owner = $9,
            user_id = $10,
            status = $11,
            cargo_owner = $12
        WHERE id = $13
        RETURNING *;
    `;
    const values = [
        cargo_date,
        cost,
        driver,
        location_from,
        price,
        location_to,
        transportation_comment,
        truck,
        truck_owner,
        user_id,
        status,
        cargo_owner,

        id // Include the id in the values array
    ];

    try {
        const result = await pool.query(query, values);
        
        if (result.rows.length === 1) {
            return res.status(201).json(result.rows[0]); // Return updated record with HTTP status 200
        }

        return res.status(404).json({ error: 'Transportation record not found' }); // Handle record not found
    } catch (err) {
        console.error('Error updating data:', err);
        return res.status(500).json({ error: 'Error updating data' }); // Handle errors
    }
};



// Сума за сьогодні та за місяць

const getDayAndMonthSum = async (req,res)=>{
    try {
        const result = await pool.query(`
          SELECT 
              SUM(CASE WHEN created_at::date = CURRENT_DATE THEN cost ELSE 0 END) AS total_cost_today,
              SUM(CASE WHEN created_at::date >= DATE_TRUNC('month', CURRENT_DATE) THEN cost ELSE 0 END) AS total_cost_this_month
          FROM transportation
        `);
    console.log(result.rows);
    const result1 = await pool.query(`
        SELECT 
          SUM(CASE WHEN created_at::date = CURRENT_DATE THEN cost ELSE 0 END) AS total_cost_today,
          SUM(CASE WHEN created_at::date >= DATE_TRUNC('month', CURRENT_DATE) THEN cost ELSE 0 END) AS total_cost_this_month,
          SUM(CASE WHEN created_at::date >= DATE_TRUNC('year', CURRENT_DATE) THEN cost ELSE 0 END) AS total_cost_this_year,
          SUM(cost) AS total_cost_all_time
        FROM transportation
      `);

        res.json(result1.rows[0]);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
      }
}

const getEarningsForPeriod = async (req, res) => {
    try {
      const { startDate, endDate } = req.query; // Отримуємо дати з запиту
  
      const result = await pool.query(`
        SELECT 
          SUM(cost) AS total_cost_for_period
        FROM transportation
        WHERE created_at::date BETWEEN $1 AND $2
      `, [startDate, endDate]); // Використовуємо параметри для безпеки SQL-запиту
  
      console.log(result.rows);
  
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }


const getTransportationStatus = async (req,res) =>{
    try {
        const result = await pool.query(`select * from transportation_status_list`);


        res.json(result.rows)
    } catch (error) {
        console.log(err);
        
    }
}

module.exports = {
    createTransportation, 
    getTransportationsList, 
    createTransportationСomment,
    searchTransportations,


    updateTransportation,


    getDayAndMonthSum,
    getEarningsForPeriod,



    getTransportationStatus,
    

};
