// database.js
const mysql = require('mysql2/promise');            //El uso de promesas simplifica la escritura y manejo del flujo asíncrono

// Configuración: actualiza user, password y database según tu instalación local.
const config = {
  host: "localhost",
  user: "cdr_user",       // ej.: "root". Lo podem elegir
  password: "jana",// tu contraseña de MySQL. Tmb la podem elegir
  database: "CDR_DB"        // nombre de la base de datos
};

let pool;               //interlaza variables locales

const DatabaseConnector = {
  connect: async () => {                    //async por si pusiesemos await
    pool = mysql.createPool(config);        //crea la pool y le pasa la config 
    console.log("Connected to MySQL Database.");
  },
  // Ejecuta una consulta SELECT en la tabla especificada
  // `whereClause` es una cadena que incluye la palabra "WHERE" si hay condiciones,
  // `values` es un arreglo de valores para la consulta parametrizada,
  // y `limit` es opcional.
  queryDocuments: async (tableName, whereClause, values, limit) => {           //crea la consulta 
    let sql = `SELECT * FROM \`${tableName}\` `;            //Usuarios, Timetables o tasks...
    if (whereClause) {                          //restricciones en la peticion
      sql += whereClause + " ";
    }
    if (limit) {                                // limite de filas de la consulta
      sql += "LIMIT " + limit;
    }
    // Ejecuta la consulta y devuelve las filas.
    const [rows] = await pool.query(sql, values);
    return rows;
  }
};

module.exports = DatabaseConnector;
