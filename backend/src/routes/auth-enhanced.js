const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const AuthUtils = require('../lib/authUtils');
const emailService = require('../services/emailService');
const SecurityService = require('../services/securityService');
const { validateSchema } = require('../lib/validation');
const { ValidationSchemas } = require('../lib/validation');

const router = express.Router();

// Apply rate limiters
const rateLimiters = AuthUtils.createRateLimiters();

// Enhanced login with security features
router.post('/login', 
  rateLimiters.login,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 1 }),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: errors.array()
        });
      }

      const { email, password, rememberMe, twoFactorToken } = req.body;
      const clientInfo = AuthUtils.extractClientInfo(req);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if account is locked
      if (AuthUtils.isAccountLocked(user)) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to multiple failed login attempts',
          lockedUntil: user.lockedUntil
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact administrator.'
        });
      }

      // Verify password
      const isValidPassword = await AuthUtils.verifyPassword(password, user.password);
      
      if (!isValidPassword) {
        // Increment login attempts
        const newAttempts = user.loginAttempts + 1;
        const lockedUntil = AuthUtils.calculateLockoutTime(newAttempts);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: newAttempts,
            lockedUntil: lockedUntil
          }
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          remainingAttempts: Math.max(0, 5 - newAttempts)
        });
      }

      // Check 2FA if enabled
      const twoFactorResult = await SecurityService.verify2FAToken(user.id, twoFactorToken);
      
      if (twoFactorResult.required && !twoFactorResult.verified) {
        return res.status(202).json({
          success: false,
          message: 'Two-factor authentication required',
          requiresTwoFactor: true,
          userId: user.id // Temporary, for 2FA verification
        });
      }

      // Successful login - reset attempts and update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: 0,
          lockedUntil: null,
          lastLogin: new Date()
        }
      });

      // Generate session
      const session = AuthUtils.generateSession(user);
      const tokenExpiry = rememberMe ? '7d' : '24h';
      
      const token = AuthUtils.generateJWT(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          sessionId: session.sessionData.sessionId
        },
        { expiresIn: tokenExpiry }
      );

      // Send login alert email if enabled
      if (process.env.SEND_LOGIN_ALERTS === 'true') {
        await emailService.sendLoginAlert(user, clientInfo);
      }

      // Log activity
      await prisma.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: 'LOGIN',
          description: `User logged in from ${clientInfo.ip}`,
          entityType: 'USER',
          entityId: user.id,
          userId: user.id,
          ipAddress: clientInfo.ip,
          userAgent: clientInfo.userAgent
        }
      });

      res.json({
        success: true,
        token,
        refreshToken: session.refreshToken,
        user: AuthUtils.sanitizeUser(user),
        expiresAt: session.expiresAt,
        sessionId: session.sessionData.sessionId
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Enhanced registration
router.post('/register',
  rateLimiters.register,
  validateSchema(ValidationSchemas.user.create),
  async (req, res) => {
    try {
      const userData = req.validatedData;
      const clientInfo = AuthUtils.extractClientInfo(req);

      // Validate password strength
      const passwordValidation = AuthUtils.validatePasswordStrength(userData.password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Password does not meet security requirements',
          errors: passwordValidation.errors,
          strength: passwordValidation.strength
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Check bar number uniqueness for attorneys
      if (userData.barNumber) {
        const existingBarNumber = await prisma.user.findFirst({
          where: { barNumber: userData.barNumber }
        });

        if (existingBarNumber) {
          return res.status(409).json({
            success: false,
            message: 'Bar number is already registered'
          });
        }
      }

      // Hash password
      const hashedPassword = await AuthUtils.hashPassword(userData.password);
      
      // Generate email verification token
      const emailVerificationToken = AuthUtils.generateToken();

      // Create user
      const newUser = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          emailVerificationToken,
          emailVerified: false,
          role: userData.role || 'PARALEGAL'
        }
      });

      // Send welcome and verification email
      await Promise.all([
        emailService.sendWelcomeEmail(newUser),
        emailService.sendEmailVerification(newUser, emailVerificationToken)
      ]);

      // Log activity
      await prisma.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: 'REGISTER',
          description: `New user registered: ${newUser.email}`,
          entityType: 'USER',
          entityId: newUser.id,
          userId: newUser.id,
          ipAddress: clientInfo.ip,
          userAgent: clientInfo.userAgent
        }
      });

      res.status(201).json({
        success: true,
        message: 'Account created successfully. Please check your email for verification.',
        user: AuthUtils.sanitizeUser(newUser),
        requiresEmailVerification: true
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Password reset request
router.post('/forgot-password',
  rateLimiters.passwordReset,
  [
    body('email').isEmail().normalizeEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
          errors: errors.array()
        });
      }

      const { email } = req.body;
      const clientInfo = AuthUtils.extractClientInfo(req);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.'
        });
      }

      // Generate reset token (1 hour expiry)
      const resetToken = AuthUtils.generateToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update user with reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires
        }
      });

      // Send password reset email
      await emailService.sendPasswordResetEmail(user, resetToken);

      // Log activity
      await prisma.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: 'PASSWORD_RESET_REQUEST',
          description: `Password reset requested for ${email}`,
          entityType: 'USER',
          entityId: user.id,
          userId: user.id,
          ipAddress: clientInfo.ip,
          userAgent: clientInfo.userAgent
        }
      });

      res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      });

    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Password reset
router.post('/reset-password',
  [
    body('token').isLength({ min: 1 }),
    body('password').isLength({ min: 8 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: errors.array()
        });
      }

      const { token, password } = req.body;
      const clientInfo = AuthUtils.extractClientInfo(req);

      // Validate password strength
      const passwordValidation = AuthUtils.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Password does not meet security requirements',
          errors: passwordValidation.errors,
          strength: passwordValidation.strength
        });
      }

      // Find user with reset token
      const user = await prisma.user.findUnique({
        where: { passwordResetToken: token }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      // Check if token is expired
      if (AuthUtils.isTokenExpired(user.passwordResetExpires, 60)) {
        return res.status(400).json({
          success: false,
          message: 'Reset token has expired. Please request a new one.'
        });
      }

      // Hash new password
      const hashedPassword = await AuthUtils.hashPassword(password);

      // Update user password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
          loginAttempts: 0, // Reset failed attempts
          lockedUntil: null // Unlock account
        }
      });

      // Log activity
      await prisma.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: 'PASSWORD_RESET',
          description: 'Password reset successfully completed',
          entityType: 'USER',
          entityId: user.id,
          userId: user.id,
          ipAddress: clientInfo.ip,
          userAgent: clientInfo.userAgent
        }
      });

      res.json({
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.'
      });

    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Email verification
router.post('/verify-email',
  rateLimiters.emailVerification,
  [
    body('token').isLength({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid token',
          errors: errors.array()
        });
      }

      const { token } = req.body;
      const clientInfo = AuthUtils.extractClientInfo(req);

      // Find user with verification token
      const user = await prisma.user.findUnique({
        where: { emailVerificationToken: token }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification token'
        });
      }

      if (user.emailVerified) {
        return res.json({
          success: true,
          message: 'Email is already verified'
        });
      }

      // Update user as verified
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null
        }
      });

      // Log activity
      await prisma.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: 'EMAIL_VERIFIED',
          description: 'Email address verified successfully',
          entityType: 'USER',
          entityId: user.id,
          userId: user.id,
          ipAddress: clientInfo.ip,
          userAgent: clientInfo.userAgent
        }
      });

      res.json({
        success: true,
        message: 'Email verified successfully'
      });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Resend email verification
router.post('/resend-verification',
  rateLimiters.emailVerification,
  [
    body('email').isEmail().normalizeEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format',
          errors: errors.array()
        });
      }

      const { email } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      // Don't reveal if user exists
      if (!user) {
        return res.json({
          success: true,
          message: 'If an account with this email exists and is unverified, a verification email has been sent.'
        });
      }

      if (user.emailVerified) {
        return res.json({
          success: true,
          message: 'Email is already verified'
        });
      }

      // Generate new verification token
      const emailVerificationToken = AuthUtils.generateToken();

      // Update user with new token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken
        }
      });

      // Send verification email
      await emailService.sendEmailVerification(user, emailVerificationToken);

      res.json({
        success: true,
        message: 'Verification email sent'
      });

    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Change password (authenticated)
router.post('/change-password',
  // authenticateToken middleware would go here
  [
    body('currentPassword').isLength({ min: 1 }),
    body('newPassword').isLength({ min: 8 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.userId; // From auth middleware
      const clientInfo = AuthUtils.extractClientInfo(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isValidCurrentPassword = await AuthUtils.verifyPassword(currentPassword, user.password);
      if (!isValidCurrentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Validate new password strength
      const passwordValidation = AuthUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'New password does not meet security requirements',
          errors: passwordValidation.errors,
          strength: passwordValidation.strength
        });
      }

      // Check if new password is different from current
      const isSamePassword = await AuthUtils.verifyPassword(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'New password must be different from current password'
        });
      }

      // Hash new password
      const hashedPassword = await AuthUtils.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword
        }
      });

      // Log activity
      await prisma.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: 'PASSWORD_CHANGED',
          description: 'Password changed successfully',
          entityType: 'USER',
          entityId: user.id,
          userId: user.id,
          ipAddress: clientInfo.ip,
          userAgent: clientInfo.userAgent
        }
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Logout (authenticated)
router.post('/logout', async (req, res) => {
  try {
    const userId = req.user?.userId;
    const clientInfo = AuthUtils.extractClientInfo(req);

    if (userId) {
      // Log activity
      await prisma.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: 'LOGOUT',
          description: 'User logged out',
          entityType: 'USER',
          entityId: userId,
          userId: userId,
          ipAddress: clientInfo.ip,
          userAgent: clientInfo.userAgent
        }
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ===== 2FA MANAGEMENT ENDPOINTS =====

// Generate 2FA secret (authenticated)
router.post('/2fa/generate',
  // authenticateToken middleware would go here
  async (req, res) => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const result = await SecurityService.generate2FASecret(userId);
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('2FA generation error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error generating 2FA secret'
      });
    }
  }
);

// Enable 2FA (authenticated)
router.post('/2fa/enable',
  // authenticateToken middleware would go here
  [
    body('token').isLength({ min: 6, max: 6 }).isNumeric()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid 2FA token format',
          errors: errors.array()
        });
      }

      const userId = req.user?.userId;
      const { token } = req.body;
      const clientInfo = AuthUtils.extractClientInfo(req);
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const result = await SecurityService.enable2FA(userId, token);
      
      // Log security event
      await SecurityService.logSecurityEvent(
        '2FA_ENABLED',
        { userId },
        userId,
        req
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('2FA enable error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error enabling 2FA'
      });
    }
  }
);

// Disable 2FA (authenticated)
router.post('/2fa/disable',
  // authenticateToken middleware would go here
  [
    body('password').isLength({ min: 1 }),
    body('token').isLength({ min: 6, max: 6 }).isNumeric()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: errors.array()
        });
      }

      const userId = req.user?.userId;
      const { password, token } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const result = await SecurityService.disable2FA(userId, password, token);
      
      // Log security event
      await SecurityService.logSecurityEvent(
        '2FA_DISABLED',
        { userId },
        userId,
        req
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('2FA disable error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error disabling 2FA'
      });
    }
  }
);

// Verify 2FA during login (public)
router.post('/2fa/verify',
  rateLimiters.login,
  [
    body('userId').isLength({ min: 1 }),
    body('token').isLength({ min: 6, max: 6 }).isNumeric()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: errors.array()
        });
      }

      const { userId, token } = req.body;
      const clientInfo = AuthUtils.extractClientInfo(req);

      const result = await SecurityService.verify2FAToken(userId, token);
      
      if (!result.verified) {
        return res.status(401).json({
          success: false,
          message: 'Invalid 2FA token'
        });
      }

      // Get user for session generation
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Generate session after successful 2FA
      const session = AuthUtils.generateSession(user);
      const token_jwt = AuthUtils.generateJWT(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          sessionId: session.sessionData.sessionId
        },
        { expiresIn: '24h' }
      );

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date()
        }
      });

      // Log successful login with 2FA
      await prisma.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: 'LOGIN_2FA',
          description: `User logged in with 2FA from ${clientInfo.ip}`,
          entityType: 'USER',
          entityId: user.id,
          userId: user.id,
          ipAddress: clientInfo.ip,
          userAgent: clientInfo.userAgent
        }
      });

      res.json({
        success: true,
        token: token_jwt,
        refreshToken: session.refreshToken,
        user: AuthUtils.sanitizeUser(user),
        expiresAt: session.expiresAt,
        sessionId: session.sessionData.sessionId
      });

    } catch (error) {
      console.error('2FA verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

module.exports = router;