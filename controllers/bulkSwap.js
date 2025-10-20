const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Bulk swap appointments from selected appointments to another date
// @route   POST /api/v1/appointments/bulk-swap
// @access  Private (Doctor, Admin)
exports.bulkSwapAppointments = asyncHandler(async (req, res, next) => {
  const { appointmentIds, targetDate, doctorId } = req.body;

  if (!appointmentIds || !appointmentIds.length || !targetDate) {
    return next(new ErrorResponse('Please provide appointment IDs and target date', 400));
  }

  // Convert target date to Date object
  const targetDateObj = new Date(targetDate);

  // Find appointments by IDs
  let query = {
    _id: { $in: appointmentIds },
    status: { $in: ['scheduled', 'confirmed'] }
  };

  // If user is a doctor, only allow them to swap their own appointments
  if (req.user.role === 'doctor') {
    query.doctor = req.user.id;
  }

  const appointmentsToSwap = await Appointment.find(query)
    .populate('patient', 'name email phone')
    .populate('doctor', 'name email specialization');

  if (appointmentsToSwap.length === 0) {
    return next(new ErrorResponse('No appointments found in the specified time range', 404));
  }

  // Get doctor availability for the target date
  const targetDoctorId = doctorId || (req.user.role === 'doctor' ? req.user.id : null);
  
  if (!targetDoctorId) {
    return next(new ErrorResponse('Doctor ID is required for bulk swap', 400));
  }

  const doctor = await Doctor.findById(targetDoctorId);
  
  if (!doctor) {
    return next(new ErrorResponse('Doctor not found', 404));
  }

  // Get available slots on target date
  const targetDateString = targetDateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Find existing appointments on target date to determine occupied slots
  const existingAppointments = await Appointment.find({
    doctor: targetDoctorId,
    date: {
      $gte: new Date(`${targetDateString}T00:00:00.000Z`),
      $lte: new Date(`${targetDateString}T23:59:59.999Z`)
    },
    status: { $in: ['scheduled', 'confirmed'] }
  });

  // Get doctor's working hours
  const workingHours = doctor.availability?.workingHours || {
    start: '09:00',
    end: '17:00'
  };

  // Generate all possible slots for the target date
  const allSlots = generateTimeSlots(
    workingHours.start,
    workingHours.end,
    30 // 30-minute slots
  );

  // Mark occupied slots
  const occupiedSlots = existingAppointments.map(app => {
    const appDate = new Date(app.date);
    return appDate.toTimeString().slice(0, 5); // HH:MM format
  });

  // Filter available slots
  const availableSlots = allSlots.filter(slot => !occupiedSlots.includes(slot));

  // If not enough available slots
  if (availableSlots.length < appointmentsToSwap.length) {
    return next(
      new ErrorResponse(
        `Not enough available slots on ${targetDateString}. Need ${appointmentsToSwap.length} slots but only ${availableSlots.length} available.`,
        400
      )
    );
  }

  // Perform the swap
  const swapResults = [];
  
  for (let i = 0; i < appointmentsToSwap.length; i++) {
    const appointment = appointmentsToSwap[i];
    const newSlot = availableSlots[i];
    
    // Create new date with target date and available slot time
    const [hours, minutes] = newSlot.split(':').map(Number);
    const newDate = new Date(targetDateObj);
    newDate.setHours(hours, minutes, 0, 0);
    
    // Update appointment
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointment._id,
      { date: newDate },
      { new: true }
    ).populate('patient', 'name email phone')
     .populate('doctor', 'name email specialization');
    
    swapResults.push({
      originalDate: appointment.date,
      newDate: updatedAppointment.date,
      patient: updatedAppointment.patient,
      status: updatedAppointment.status
    });
  }

  // Update doctor availability
  await updateDoctorAvailability(targetDoctorId);

  res.status(200).json({
    success: true,
    count: swapResults.length,
    data: swapResults
  });
});

// Helper function to generate time slots
function generateTimeSlots(startTime, endTime, intervalMinutes) {
  const slots = [];
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  
  for (let minutes = start; minutes < end; minutes += intervalMinutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  }
  
  return slots;
}

// Export the function for use in appointments controller
module.exports = {
  bulkSwapAppointments: exports.bulkSwapAppointments
};