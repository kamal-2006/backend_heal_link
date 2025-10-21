const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");

exports.updateDoctorAvailability = async (doctorId) => {
  try {
    // Get all confirmed and scheduled appointments for this doctor
    const appointments = await Appointment.find({
      doctor: doctorId,
      status: { $in: ["confirmed", "scheduled"] },
    }).sort({ date: 1 });

    // Generate timeSlots from appointments
    const timeSlots = appointments.map((appointment) => {
      const appointmentDate = new Date(appointment.date);
      const startTime = appointmentDate.toTimeString().slice(0, 5); // HH:MM format
      const endTime = new Date(appointmentDate.getTime() + 30 * 60000)
        .toTimeString()
        .slice(0, 5); // Add 30 minutes

      return {
        startTime,
        endTime,
        date: appointmentDate.toISOString().split("T")[0], // YYYY-MM-DD format
        appointmentId: appointment._id,
      };
    });

    // Update doctor availability
    await Doctor.findByIdAndUpdate(doctorId, {
      $set: {
        "availability.timeSlots": timeSlots,
      },
    });
  } catch (error) {
    console.error("Error updating doctor availability:", error);
  }
};