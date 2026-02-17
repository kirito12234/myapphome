const express = require("express");
const {
  getMe,
  updateMe,
  changePassword,
  updateSettings,
  listFavorites,
  addFavoriteCourse,
  removeFavoriteCourse,
  addFavoriteLesson,
  removeFavoriteLesson,
  listTutorCourseFavorites,
} = require("../controllers/userController");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(protect);

// GET    /api/v1/users/me
router.get("/me", getMe);

// PUT    /api/v1/users/me
router.put("/me", updateMe);

// PUT    /api/v1/users/me/password
router.put("/me/password", changePassword);

// PUT    /api/v1/users/me/settings
router.put("/me/settings", updateSettings);

// Favorites
router.get("/me/favorites", listFavorites);
router.post("/me/favorites/courses/:courseId", addFavoriteCourse);
router.delete("/me/favorites/courses/:courseId", removeFavoriteCourse);
router.post("/me/favorites/lessons/:lessonId", addFavoriteLesson);
router.delete("/me/favorites/lessons/:lessonId", removeFavoriteLesson);
router.get("/me/favorites/received", listTutorCourseFavorites);

module.exports = router;




