
const router = require("express").Router();
const { register, login, getProfiles } = require("../controllers/auth.controller");
router.post("/register", register);
router.post("/login", login);

module.exports = router;
