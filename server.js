const http = require('http');
const url = require('url');
const DatabaseConnector = require('./database');
const QueryParser = require('./queryParser');

DatabaseConnector.connect()
  .then(() => {
    console.log("Connected to local MySQL.");
    const server = http.createServer(async (req, res) => {
      if (req.method !== "GET") {
        res.writeHead(405, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Only GET requests allowed." }));
      }

      const parsedUrl = url.parse(req.url, true);
      const pathname = parsedUrl.pathname;

      try {
        if (pathname === "/authenticate") {
          const uid = parsedUrl.query.uid;
          if (!uid) throw new Error("Missing uid parameter.");
          const whereClause = "WHERE `student_id` = ?";
          const values = [uid];
          const result = await DatabaseConnector.queryDocuments("students", whereClause, values);
          if (result.length === 0) throw new Error("UID not found.");
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify(result[0]));
        } else {
          const collectionName = pathname.substring(1);
          if (!collectionName) throw new Error("Invalid collection name.");

          const { whereClause, values, limit } = QueryParser.parse(parsedUrl.query);
          const result = await DatabaseConnector.queryDocuments(collectionName, whereClause, values, limit);
          if (result.length === 0) throw new Error("No matching records found.");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        }
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log("Server is listening on port " + PORT);
    });
  })
  .catch(err => {
    console.error("Failed to connect to the database:", err);
  });
