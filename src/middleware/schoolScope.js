exports.requireSchoolUser = (req, res, next) => {
  if (!req.user.schoolId) {
    return res.status(403).json({
      message: "This action is only allowed for school users",
    });
  }
  next();
};
