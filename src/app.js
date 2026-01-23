const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const jwt = require("jsonwebtoken");

const PORT = process.env.PORT || 5000;
const app = express();

const testRoutes = require("./routes/test.routes");
const classRoutes = require("./routes/class.routes");
const announcementRoutes = require("./routes/announcement.routes");
const quizRoutes = require("./routes/quiz.routes");


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/classes", classRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/test", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/announcements", announcementRoutes);

//temporary logging middleware

app.use((req, res, next) => {
  console.log("Headers:", req.headers["content-type"]);
  next();
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
