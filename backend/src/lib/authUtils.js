const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');

class AuthUtils {
  // Generate secure random token
  static generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate secure temporary password
  static generateTempPassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  // Hash password with salt
  static async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }

  // Verify password
  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate JWT token
  static generateJWT(payload, options = {}) {
    const defaultOptions = {
      expiresIn: '24h',
      issuer: 'legal-estate',
      audience: 'legal-estate-client'
    };
    
    return jwt.sign(payload, JWT_SECRET, { ...defaultOptions, ...options });
  }

  // Verify JWT token
  static verifyJWT(token) {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'legal-estate',
      audience: 'legal-estate-client'
    });
  }

  // Generate refresh token
  static generateRefreshToken() {
    return this.generateToken(64);
  }

  // Password strength validation
  static validatePasswordStrength(password) {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a stronger password');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  // Calculate password strength score
  static calculatePasswordStrength(password) {
    let score = 0;
    
    // Length bonus
    if (password.length >= 8) score += 10;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
    
    // Pattern variety
    if (/(.)\1{2,}/.test(password)) score -= 20; // Repeated characters
    if (/123|abc|qwe/i.test(password)) score -= 10; // Sequential characters
    
    // Determine strength level
    if (score >= 70) return 'strong';
    if (score >= 50) return 'medium';
    if (score >= 30) return 'weak';
    return 'very-weak';
  }

  // Account lockout check
  static isAccountLocked(user) {
    return user.lockedUntil && user.lockedUntil > new Date();
  }

  // Calculate lockout time based on attempts
  static calculateLockoutTime(attempts) {
    if (attempts < 5) return null;
    
    // Progressive lockout: 5 min, 15 min, 1 hour, 24 hours
    const lockoutTimes = [5, 15, 60, 1440]; // in minutes
    const index = Math.min(attempts - 5, lockoutTimes.length - 1);
    
    return new Date(Date.now() + lockoutTimes[index] * 60 * 1000);
  }

  // Rate limiting configurations
  static createRateLimiters() {
    return {
      // Login attempts: 5 per 15 minutes
      login: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5,
        message: {
          success: false,
          message: 'Too many login attempts. Please try again in 15 minutes.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
      }),

      // Registration: 3 per hour
      register: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3,
        message: {
          success: false,
          message: 'Too many registration attempts. Please try again in 1 hour.'
        },
        standardHeaders: true,
        legacyHeaders: false,
      }),

      // Password reset: 3 per hour
      passwordReset: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3,
        message: {
          success: false,
          message: 'Too many password reset requests. Please try again in 1 hour.'
        },
        standardHeaders: true,
        legacyHeaders: false,
      }),

      // Email verification: 5 per hour
      emailVerification: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 5,
        message: {
          success: false,
          message: 'Too many verification requests. Please try again in 1 hour.'
        },
        standardHeaders: true,
        legacyHeaders: false,
      }),

      // General API: 1000 per hour
      general: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 1000,
        message: {
          success: false,
          message: 'Too many requests. Please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
      })
    };
  }

  // Sanitize user data for response
  static sanitizeUser(user) {
    const { 
      password, 
      emailVerificationToken, 
      passwordResetToken, 
      twoFactorSecret,
      loginAttempts,
      ...sanitizedUser 
    } = user;
    
    return sanitizedUser;
  }

  // Extract client information from request
  static extractClientInfo(req) {
    return {
      ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date()
    };
  }

  // Generate CSRF token
  static generateCSRFToken() {
    return this.generateToken(32);
  }

  // Validate email format
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Check if token is expired
  static isTokenExpired(tokenDate, expiryMinutes = 60) {
    if (!tokenDate) return true;
    
    const expiryTime = new Date(tokenDate.getTime() + (expiryMinutes * 60 * 1000));
    return new Date() > expiryTime;
  }

  // Generate secure session
  static generateSession(user) {
    const sessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: this.generateToken(16),
      createdAt: new Date(),
    };

    const accessToken = this.generateJWT(sessionData, { expiresIn: '15m' });
    const refreshToken = this.generateRefreshToken();

    return {
      accessToken,
      refreshToken,
      sessionData,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };
  }
}

module.exports = AuthUtils;