module.exports.requireTeacher = (req, res, next) => {
  if (req.user.role !== "TEACHER" && req.user.role !== "PRIVATE_TEACHER") {
    return res.status(403).json({ message: "Teacher access only" });
  }
  next();
};
