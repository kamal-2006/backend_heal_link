const Nurse = require('../models/Nurse');

// @desc    Get all nurses for admin
// @route   GET /api/v1/nurse/admin/all
// @access  Public (for admin dashboard)
exports.getAllNursesForAdmin = async (req, res) => {
  try {
    const nurses = await Nurse.find()
      .populate({
        path: 'user',
        select: 'firstName lastName email phone'
      });
    res.status(200).json({ success: true, count: nurses.length, data: nurses });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
