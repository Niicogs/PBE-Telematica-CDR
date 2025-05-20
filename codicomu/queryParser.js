// queryParser.js
const QueryParser = {
  parse: (query) => {
    let conditions = [];
    let values = [];
    let limit = null;

    // Extraer la tabla del query
    const table = query.table;
    delete query.table;

    // Convertir query string a pares clave-valor
    const pairs = Object.entries(query);

    for (let [key, value] of pairs) {
      if (key === "limit") {
        limit = parseInt(value, 10);
        continue;
      }

      let isArray = key.includes("[");

      if (isArray) {
        let [field, operator] = key.split("[");
        operator = operator.replace("]", "");
        let sqlOp = operator === "gte" ? ">=" : operator === "gt" ? ">" : operator === "lte" ? "<=" : operator === "lt" ? "<" : "=";
        conditions.push(`\`${field}\` ${sqlOp} ?`);
        values.push(value === "now" ? new Date().toISOString().slice(0, 19).replace('T', ' ') : value);
      } else {
        conditions.push(`\`${key}\` = ?`);
        values.push(value);
      }
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    return { whereClause, values, limit };
  }
};

module.exports = QueryParser;
