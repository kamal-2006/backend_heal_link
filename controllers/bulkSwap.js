const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");
const { updateDoctorAvailability } = require("../utils/doctorUtils");
const NotificationService = require("../utils/notificationService");

// @desc    Bulk swap appointments from selected appointments to another date
// @route   POST /api/v1/appointments/bulk-swap
// @access  Private (Doctor, Admin)
exports.bulkSwapAppointments = asyncHandler(async (req, res, next) => {
  const { appointmentIds, targetDate, doctorId } = req.body;

  if (!appointmentIds || !appointmentIds.length || !targetDate || !doctorId) {
    return next(new ErrorResponse('Please provide appointment IDs, target date, and doctor ID', 400));
  }

  const appointmentsToSwap = await Appointment.find({
    _id: { $in: appointmentIds },
    ...(req.user.role === 'doctor' && { doctor: req.user.id }),
  }).populate('patient', 'firstName lastName');

  if (!appointmentsToSwap.length) {
    return next(new ErrorResponse('No valid appointments found to swap.', 404));
  }

  const targetDoctor = await Doctor.findById(doctorId).populate('user', 'firstName lastName');
  if (!targetDoctor) {
    return next(new ErrorResponse('Target doctor not found.', 404));
  }
  const targetDoctorUserId = targetDoctor.user._id;
  const targetDoctorName = `Dr. ${targetDoctor.user.firstName} ${targetDoctor.user.lastName}`;

  const swappedAppointments = [];
  const failedAppointments = [];

  for (const appointment of appointmentsToSwap) {
    const originalDate = new Date(appointment.date);
    const hours = originalDate.getUTCHours();
    const minutes = originalDate.getUTCMinutes();

    const newDate = new Date(targetDate);
    newDate.setUTCHours(hours, minutes, 0, 0);

    const existingAppointment = await Appointment.findOne({
      doctor: targetDoctorUserId,
      date: newDate,
      status: { $in: ['scheduled', 'confirmed'] },
    });

    if (existingAppointment) {
      failedAppointments.push({
        _id: appointment._id,
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        date: originalDate.toLocaleDateString(),
        time: originalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reason: `Slot at ${newDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with ${targetDoctorName} is already booked.`,
      });
      continue;
    }

    try {
      const originalDoctor = await Doctor.findById(appointment.doctor).populate('user', 'firstName lastName');
      
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        appointment._id,
        { date: newDate, doctor: targetDoctorUserId },
        { new: true, runValidators: true }
      ).populate('patient', 'firstName lastName');

      // Send doctor swap notification to patient
      try {
        const patientDoc = await Patient.findById(updatedAppointment.patient._id).populate('user');
        if (patientDoc && patientDoc.user) {
          await NotificationService.sendDoctorSwapNotification(
            {
              _id: patientDoc.user._id,
              name: `${patientDoc.user.firstName} ${patientDoc.user.lastName}`
            },
            {
              _id: originalDoctor._id,
              name: `${originalDoctor.user.firstName} ${originalDoctor.user.lastName}`
            },
            {
              _id: targetDoctor._id,
              name: targetDoctorName
            },
            updatedAppointment
          );
        }
      } catch (notifError) {
        console.error('Failed to send doctor swap notification:', notifError);
      }

      swappedAppointments.push({
        _id: updatedAppointment._id,
        patientName: `${updatedAppointment.patient.firstName} ${updatedAppointment.patient.lastName}`,
        originalDate: originalDate.toLocaleDateString(),
        originalTime: originalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        newDate: updatedAppointment.date.toLocaleDateString(),
        newTime: updatedAppointment.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (error) {
      failedAppointments.push({
        _id: appointment._id,
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        date: originalDate.toLocaleDateString(),
        time: originalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reason: 'Failed to update appointment in database.',
      });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      total: appointmentsToSwap.length,
      success: swappedAppointments.length,
      failed: failedAppointments.length,
      swappedAppointments,
      failedAppointments,
    },
  });
});

// Export the function for use in appointments controller
module.exports = {
  bulkSwapAppointments: exports.bulkSwapAppointments
};