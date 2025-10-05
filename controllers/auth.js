const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, role, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // Create user
    user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      role,
      password,
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate email and password
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please provide an email and password' });
        }

        // Check for user
        const user = await User.findOne({ email }).select('+password +isDefaultPassword');

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        sendTokenResponse(user, 200, res);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error during login',
        });
    }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error during logout'
    });
  }
};


// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error fetching user profile'
    });
  }
};

// @desc    Google OAuth login
// @route   POST /api/v1/auth/google
// @access  Public
exports.googleLogin = async (req, res, next) => {
  try {
    const { tokenId } = req.body;
    
    if (!tokenId) {
      return res.status(400).json({
        success: false,
        error: 'Google token is required'
      });
    }

    // Check if GOOGLE_CLIENT_ID is configured
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error('GOOGLE_CLIENT_ID environment variable is not configured');
      return res.status(500).json({
        success: false,
        error: 'Google authentication is not properly configured on the server'
      });
    }

    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const expectedClientId = process.env.GOOGLE_CLIENT_ID;
    
    // Verify the Google token
    let ticket;
    try {
      ticket = await client.verifyIdToken({ 
        idToken: tokenId, 
        audience: expectedClientId 
      });
    } catch (verifyError) {
      console.error('Google token verification failed:', verifyError);
      return res.status(401).json({
        success: false,
        error: 'Failed to verify Google token: ' + verifyError.message
      });
    }

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Google token payload'
      });
    }

    if (payload?.aud && payload.aud !== expectedClientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Google token audience does not match configured client ID' 
      });
    }

    // Extract user information from payload
    const { sub: googleId, email, given_name: firstName, family_name: lastName, picture } = payload;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email not provided in Google token'
      });
    }

    // Check if user already exists
    let user = await User.findOne({ 
      $or: [
        { email },
        { googleId }
      ]
    });

    if (user) {
      // Update existing user with Google info if they don't have it
      if (!user.googleId) {
        user.googleId = googleId;
        user.googleProfile = {
          picture,
          verified: payload.email_verified
        };
        user.isGoogleUser = true;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        firstName: firstName || 'Google',
        lastName: lastName || 'User',
        email,
        googleId,
        googleProfile: {
          picture,
          verified: payload.email_verified
        },
        isGoogleUser: true,
        role: 'patient' // Default role, can be changed later
      });
    }
    
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Google login error:', error?.message || error);
    res.status(500).json({
      success: false,
      error: `Google authentication failed: ${error?.message || 'Unknown error'}`,
    });
  }
};


// @desc    Update user role after Google login
// @route   PUT /api/v1/auth/update-role
// @access  Private
exports.updateRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const userId = req.user.id;

    if (!role || !['patient', 'doctor'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid role (patient or doctor) is required' 
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: 'Role updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error during role update',
    });
  }
};

// @desc    Check if user has default password
// @route   GET /api/v1/auth/check-default-password
// @access  Private
exports.checkDefaultPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+isDefaultPassword');
    
    res.status(200).json({
      success: true,
      isDefaultPassword: user.isDefaultPassword || false,
      role: user.role
    });
  } catch (error) {
    console.error('Check default password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Change password
// @route   PUT /api/v1/auth/changepassword
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current password and new password'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Update password
    user.password = newPassword;
    // If this is a doctor changing from default password, mark as not default
    if (user.role === 'doctor' && user.isDefaultPassword) {
      user.isDefaultPassword = false;
    }
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      isDefaultPassword: user.isDefaultPassword
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during password change'
    });
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    // Prepare response data
    const responseData = { 
        success: true, 
        token, 
        role: user.role,
        user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
        }
    };

    // Add default password information for doctors
    if (user.role === 'doctor' && user.isDefaultPassword) {
        responseData.requiresPasswordChange = true;
        responseData.message = 'Please change your password for security';
    }

    res
        .status(statusCode)
        .cookie('token', token, options)
        .json(responseData);
};
