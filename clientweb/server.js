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
      const collectionName = pathname.substring(1);

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
        }

        if (!collectionName) throw new Error("Invalid collection name.");

        const { whereClause, values, limit } = QueryParser.parse({ ...parsedUrl.query, table: collectionName });
        const result = await DatabaseConnector.queryDocuments(collectionName, whereClause, values, limit);

        if (result.length === 0) throw new Error("No matching records found.");

        let orderedResult = result;

        if (collectionName === "tasks") {
          orderedResult = result.sort((a, b) => new Date(a.date) - new Date(b.date));
        } else if (collectionName === "marks") {
          orderedResult = result.sort((a, b) => a.subject.localeCompare(b.subject));
        } else if (collectionName === "timetables") {
          const dayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const today = new Date();
          const currentDayIndex = today.getDay();
          const currentTime = today.toTimeString().split(" ")[0];

          orderedResult = result.sort((a, b) => {
            const dayAIndex = dayOrder.indexOf(a.day);
            const dayBIndex = dayOrder.indexOf(b.day);

            const isTodayA = (dayAIndex === currentDayIndex);
            const isTodayB = (dayBIndex === currentDayIndex);

            const timeComparison = a.hour.localeCompare(b.hour);

            // Si ambos son hoy, se ordenan por hora
            if (isTodayA && isTodayB) {
              return timeComparison;
            }

            // Si A es hoy y aún no ha pasado, debe aparecer primero
            if (isTodayA && a.hour >= currentTime) return -1;

            // Si B es hoy y aún no ha pasado, debe aparecer primero
            if (isTodayB && b.hour >= currentTime) return 1;

            // Si A es hoy y ya pasó, debe ir al final
            if (isTodayA && a.hour < currentTime) return 1;

            // Si B es hoy y ya pasó, debe ir al final
            if (isTodayB && b.hour < currentTime) return -1;

            // Comparar días de manera circular
            const relativeA = (dayAIndex >= currentDayIndex) ? dayAIndex - currentDayIndex : dayAIndex + 7 - currentDayIndex;
            const relativeB = (dayBIndex >= currentDayIndex) ? dayBIndex - currentDayIndex : dayBIndex + 7 - currentDayIndex;

            return relativeA - relativeB;
          });
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(orderedResult));
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
