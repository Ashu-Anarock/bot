const { Pool } = require('pg');
const dotenv = require('dotenv');



async function pool_connection(){
    await  dotenv.config();


    const pool = await new Pool({
        user:process.env.DB_USER, 
        host: process.env.host,
        database: process.env.DB_NAME, 
        password: process.env.DB_PASSWORD,
        port: process.env.port, 
    });

    return pool;
}

  insertUsernameQuery = async (username, date, location) => {
    const pool = await pool_connection();
    try {
      await pool.query(
        `INSERT INTO daily_location (name, date, location)
        VALUES ($1, $2, $3)
        ON CONFLICT (name, date) 
        DO UPDATE SET location = EXCLUDED.location;`,
        [username, date, location]
      );
    } catch (error) {
      console.error("Error executing query:", error);
      throw error;
    }
}

async function getUserResponses() {
  const today = new Date().toISOString().split('T')[0];
  const query = `
    SELECT name,location 
    FROM daily_location 
    WHERE date = $1
  `;
  pool = await pool_connection();
  const result = await pool.query(query, [today]);
  console.log(result.rows)
  return result.rows; 
}


  module.exports = {insertUsernameQuery,getUserResponses}
