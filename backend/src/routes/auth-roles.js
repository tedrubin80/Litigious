const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const AuthUtils = require('../lib/authUtils');
const router = express.Router();

const prisma = new PrismaClient();

// JWT Secret — crash at startup if not configured
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');

/**
 * Admin Login Endpoint
 * For system administrators and staff
 */
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required',
          statusCode: 400,
          type: 'VALIDATION_ERROR'
        }
      });
    }

    // Find user with admin or staff roles only
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          statusCode: 401,
          type: 'AUTHENTICATION_ERROR'
        }
      });
    }

    // Check if user has admin privileges
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'ATTORNEY', 'PARALEGAL', 'STAFF'];
    if (!adminRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Admin privileges required.',
          statusCode: 403,
          type: 'AUTHORIZATION_ERROR'
        }
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          statusCode: 401,
          type: 'AUTHENTICATION_ERROR'
        }
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Account is deactivated',
          statusCode: 401,
          type: 'ACCOUNT_DEACTIVATED'
        }
      });
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({
        success: false,
        error: {
          message: 'Account is temporarily locked',
          statusCode: 423,
          type: 'ACCOUNT_LOCKED',
          lockedUntil: user.lockedUntil
        }
      });
    }

    // Reset login attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date()
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        loginType: 'admin'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success response
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        phone: user.phone,
        address: user.address,
        barNumber: user.barNumber,
        signature: user.signature,
        hourlyRate: user.hourlyRate,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin
      },
      loginType: 'admin'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during admin authentication',
        statusCode: 500,
        type: 'INTERNAL_ERROR'
      }
    });
  }
});

/**
 * Client/Tenant Login Endpoint
 * For clients accessing their case information
 */
router.post('/client/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier is email for User table

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required',
          statusCode: 400,
          type: 'VALIDATION_ERROR'
        }
      });
    }

    // Find user with CLIENT role
    const user = await prisma.user.findUnique({
      where: { email: identifier.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid login credentials',
          statusCode: 401,
          type: 'AUTHENTICATION_ERROR'
        }
      });
    }

    // Check if user has CLIENT role
    if (user.role !== 'CLIENT') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. This is the client portal.',
          statusCode: 403,
          type: 'AUTHORIZATION_ERROR'
        }
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid login credentials',
          statusCode: 401,
          type: 'AUTHENTICATION_ERROR'
        }
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Account is deactivated',
          statusCode: 401,
          type: 'ACCOUNT_DEACTIVATED'
        }
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate JWT token for client
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        loginType: 'client'
      },
      JWT_SECRET,
      { expiresIn: '12h' } // Shorter session for clients
    );

    // Return success response
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        phone: user.phone,
        address: user.address,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin
      },
      loginType: 'client'
    });

  } catch (error) {
    console.error('Client login error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during client authentication',
        statusCode: 500,
        type: 'INTERNAL_ERROR'
      }
    });
  }
});

/**
 * Client Password Setup/Reset
 * Requires a valid password reset token issued by staff.
 */
router.post('/client/setup-password', async (req, res) => {
  try {
    const { identifier, newPassword, confirmPassword, verificationCode } = req.body;

    if (!identifier || !newPassword || !confirmPassword || !verificationCode) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email, passwords, and verification code are required',
          statusCode: 400,
          type: 'VALIDATION_ERROR'
        }
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Passwords do not match',
          statusCode: 400,
          type: 'VALIDATION_ERROR'
        }
      });
    }

    const passwordValidation = AuthUtils.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password does not meet security requirements',
          statusCode: 400,
          type: 'VALIDATION_ERROR',
          details: passwordValidation.errors
        }
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: identifier.toLowerCase(),
        role: 'CLIENT',
        isActive: true,
        passwordResetToken: verificationCode,
        passwordResetExpires: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid or expired verification code',
          statusCode: 400,
          type: 'VALIDATION_ERROR'
        }
      });
    }

    const hashedPassword = await AuthUtils.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        emailVerified: true,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Password setup completed successfully'
    });

  } catch (error) {
    console.error('Client password setup error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during password setup',
        statusCode: 500,
        type: 'INTERNAL_ERROR'
      }
    });
  }
});

/**
 * Logout endpoint (works for both admin and client)
 */
router.post('/logout', async (req, res) => {
  try {
    // In a production app, you might want to blacklist the token
    // or store session information to invalidate
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during logout',
        statusCode: 500,
        type: 'INTERNAL_ERROR'
      }
    });
  }
});

/**
 * Token verification endpoint
 */
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'No token provided',
          statusCode: 401,
          type: 'AUTHENTICATION_ERROR'
        }
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.loginType === 'admin') {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid or inactive user',
            statusCode: 401,
            type: 'AUTHENTICATION_ERROR'
          }
        });
      }

      res.json({
        success: true,
        user,
        loginType: 'admin'
      });
    } else if (decoded.loginType === 'client') {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          phone: true,
          address: true
        }
      });

      if (!user || !user.isActive || user.role !== 'CLIENT') {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid or inactive client',
            statusCode: 401,
            type: 'AUTHENTICATION_ERROR'
          }
        });
      }

      res.json({
        success: true,
        user,
        loginType: 'client'
      });
    } else {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token type',
          statusCode: 401,
          type: 'AUTHENTICATION_ERROR'
        }
      });
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired token',
          statusCode: 401,
          type: 'AUTHENTICATION_ERROR'
        }
      });
    }

    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during token verification',
        statusCode: 500,
        type: 'INTERNAL_ERROR'
      }
    });
  }
});

module.exports = router;