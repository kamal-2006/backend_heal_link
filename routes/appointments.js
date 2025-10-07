const express = require("express");
const {
  getAppointments,
  getAppointment,
  bookAppointment,
  updateAppointment,
  cancelAppointment,
  deleteAppointment,
  getDoctorAvailability,
  getPatientAppointments,
} = require("../controllers/appointments");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Public routes (with authentication)
router.route("/").get(protect, getAppointments);

router.route("/book").post(protect, bookAppointment);

router
  .route("/:id")
  .get(protect, getAppointment)
  .put(protect, updateAppointment)
  .delete(protect, authorize("admin"), deleteAppointment);

router.route("/:id/cancel").put(protect, cancelAppointment);

// Patient appointments
router.get("/patient/:id", protect, getPatientAppointments);

// Doctor availability
router.get("/doctors/:id/availability", protect, getDoctorAvailability);

module.exports = router;
