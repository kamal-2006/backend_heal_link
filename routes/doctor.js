const express = require("express");
const {
  getDoctorProfile,
  updateDoctorProfile,
  getDoctors,
  getDoctor,
  getDoctorAppointments,
  getDoctorDashboardData,
  getDoctorPatients,
} = require("../controllers/doctor");
const { protect, authorize } = require("../middleware/auth");
const { parseFormDataJSON, validateDoctorProfileUpdate, validateTimeSlots } = require("../middleware/doctorValidation");

const router = express.Router();

// Doctor profile routes with validation
router
  .route("/me")
  .get(protect, authorize("doctor"), getDoctorProfile)
  .put(
    protect, 
    authorize("doctor"), 
    parseFormDataJSON,
    ...validateDoctorProfileUpdate,
    validateTimeSlots,
    updateDoctorProfile
  );

// Specific profile section updates
router.put(
  "/me/settings",
  protect,
  authorize("doctor"),
  parseFormDataJSON,
  ...validateDoctorProfileUpdate,
  validateTimeSlots,
  updateDoctorProfile
);

router.put(
  "/me/availability",
  protect,
  authorize("doctor"),
  parseFormDataJSON,
  ...validateDoctorProfileUpdate,
  validateTimeSlots,
  updateDoctorProfile
);

router.get(
  "/dashboard-data",
  protect,
  authorize("doctor"),
  getDoctorDashboardData
);

// Doctor patients route
router.get(
  "/patients",
  protect,
  authorize("doctor"),
  getDoctorPatients
);

// Doctor appointments route - Allow both doctors and admins to access
router.get(
  "/appointments",
  protect,
  authorize("doctor", "admin"),
  getDoctorAppointments
);

// Public doctor routes
router.get("/", getDoctors);
router.get("/:id", getDoctor);

module.exports = router;
