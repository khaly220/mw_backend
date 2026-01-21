const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const jwt = require("jsonwebtoken");

const PORT = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(cors());

// THIS LINE IS ESSENTIAL
app.use(express.json()); // parses JSON bodies
app.use(express.urlencoded({ extended: true })); // parses form-encoded bodies

// Routes
app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
