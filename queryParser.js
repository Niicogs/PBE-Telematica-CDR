// queryParser.js
const QueryParser = {
  // Recibe el objeto de query (ejemplo: {subject: "PBE", "date[gte]": "now", limit: "1"})
  // Retorna: { whereClause: "WHERE ...", values: [ ... ], limit: <number> }
  parse: (query) => { //funcio que rep un aobjecte query
    let conditions = []; //guarda condicion SQL
    let values = []; //valors a subtituir en els '?'
    let limit = null; //guarda el límit si ve (el lími delimita quants resultats vols)
    for (let key in query) { //va clau per clau de l'objecte
      if (key === "limit") { //si la clau és límit, el guarda com a número i salta a la següent clau
        limit = parseInt(query[key], 10);
        continue;
      }
      if (key.includes("[")) { 
       
        let matches = key.match(/(.+)\[(.+)\]/);
        if (matches) {
          let field = matches[1];
          let operator = matches[2];
          let sqlOp;
          switch(operator) { //mapeja els operadors SQL (sitch per a escollir quin operador Sql utilitzar)
            case "gte": //operador '>='... (pels altres igual)
              sqlOp = ">=";
              break;
            case "gt":
              sqlOp = ">";
              break;
            case "lte":
              sqlOp = "<=";
              break;
            case "lt":
              sqlOp = "<";
              break;
            default:
              sqlOp = "=";
          }
          conditions.push(`\`${field}\` ${sqlOp} ?`);
          let value = query[key];
          if (value === "now") {
            // Convertir a formato MySQL DATETIME: "YYYY-MM-DD HH:MM:SS"
            value = new Date().toISOString().slice(0, 19).replace('T', ' ');
          }
          values.push(value);
        }
      } else {
        conditions.push(`\`${key}\` = ?`); //tradueix a ex: 'subject' = ?
        let value = query[key];
        if (value === "now") {
          value = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
        values.push(value);
      }
    } //uneix totes les condicions amb un 'AND' i ho torna preparat per a posar-ho en un query SQL
    let whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    return { whereClause, values, limit };
  }
};

module.exports = QueryParser;
