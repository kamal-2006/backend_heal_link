const express = require("express");
const {
  getDoctorProfile,
  updateDoctorProfile,
  getDoctors,
  getDoctor,
  getDoctorAppointments,
} = require("../controllers/doctor");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Doctor profile routes
router
  .route("/me")
  .get(protect, authorize("doctor"), getDoctorProfile)
  .put(protect, authorize("doctor"), updateDoctorProfile);

// Doctor appointments route
router.get(
  "/appointments",
  protect,
  authorize("doctor"),
  getDoctorAppointments
);

// Public doctor routes
router.get("/", getDoctors);
router.get("/:id", getDoctor);

module.exports = router;
