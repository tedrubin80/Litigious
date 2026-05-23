const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const AuthUtils = require('../lib/authUtils');

class SecurityService {
  constructor() {
    this.appName = 'Legal Estate';
    this.issuer = 'Legal Estate Management';
  }

  // Generate 2FA secret for user
  async generate2FASecret(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, twoFactorEnabled: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.twoFactorEnabled) {
        throw new Error('2FA is already enabled for this user');
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${this.appName} (${user.email})`,
        issuer: this.issuer,
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Store temporary secret (not yet confirmed)
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorSecret: secret.base32 // Store base32 encoded secret
        }
      });

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32,
        backupCodes: this.generateBackupCodes()
      };
    } catch (error) {
      console.error('Error generating 2FA secret:', error);
      throw error;
    }
  }

  // Verify 2FA token and enable 2FA
  async enable2FA(userId, token) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          twoFactorSecret: true, 
          twoFactorEnabled: true 
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.twoFactorSecret) {
        throw new Error('2FA setup not initiated. Please generate a secret first.');
      }

      if (user.twoFactorEnabled) {
        throw new Error('2FA is already enabled');
      }

      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps (30 seconds each) for clock drift
      });

      if (!verified) {
        throw new Error('Invalid 2FA token');
      }

      // Enable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true
        }
      });

      // Log activity
      await prisma.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: '2FA_ENABLED',
          description: 'Two-factor authentication enabled',
          entityType: 'USER',
          entityId: userId,
          userId: userId
        }
      });

      return {
        success: true,
        message: '2FA enabled successfully',
        backupCodes: this.generateBackupCodes()
      };
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      throw error;
    }
  }

  // Disable 2FA
  async disable2FA(userId, password, token) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.twoFactorEnabled) {
        throw new Error('2FA is not enabled');
      }

      // Verify password
      const isValidPassword = await AuthUtils.verifyPassword(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }

      // Verify 2FA token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        throw new Error('Invalid 2FA token');
      }

      // Disable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null
        }
      });

      // Log activity
      await prisma.activity.create({
        data: {
          id: AuthUtils.generateToken(16),
          action: '2FA_DISABLED',
          description: 'Two-factor authentication disabled',
          entityType: 'USER',
          entityId: userId,
          userId: userId
        }
      });

      return {
        success: true,
        message: '2FA disabled successfully'
      };
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw error;
    }
  }

  // Verify 2FA token during login
  async verify2FAToken(userId, token) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          twoFactorEnabled: true,
          twoFactorSecret: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.twoFactorEnabled) {
        return { verified: true, required: false };
      }

      if (!token) {
        return { verified: false, required: true };
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      return {
        verified,
        required: true
      };
    } catch (error) {
      console.error('Error verifying 2FA token:', error);
      return { verified: false, required: true };
    }
  }

  // Generate backup codes
  generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-digit backup codes
      const code = Math.floor(10000000 + Math.random() * 90000000).toString();
      codes.push(code);
    }
    return codes;
  }

  // Security headers middleware
  static getSecurityHeaders() {
    return {
      // Prevent clickjacking
      'X-Frame-Options': 'DENY',
      
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // XSS protection
      'X-XSS-Protection': '1; mode=block',
      
      // Referrer policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Permissions policy
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      
      // Strict transport security
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      
      // Content security policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'"
      ].join('; ')
    };
  }

  // Generate CSRF token
  static generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Validate CSRF token
  static validateCSRFToken(sessionToken, requestToken) {
    if (!sessionToken || !requestToken) {
      return false;
    }
    
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(sessionToken, 'hex'),
      Buffer.from(requestToken, 'hex')
    );
  }

  // IP whitelist/blacklist management
  async checkIPSecurity(ip, userId = null) {
    try {
      // Check if IP is blacklisted
      const blacklistedIP = await prisma.blacklistedIP?.findFirst({
        where: { ip: ip }
      });

      if (blacklistedIP) {
        return {
          allowed: false,
          reason: 'IP address is blacklisted',
          risk: 'high'
        };
      }

      // Check suspicious activity patterns
      let recentFailedAttempts = 0;
      try {
        recentFailedAttempts = await prisma.activity?.count({
          where: {
            action: 'LOGIN_FAILED',
            ipAddress: ip,
            createdAt: {
              gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
            }
          }
        }) || 0;
      } catch (error) {
        // Activity table may not exist yet, continue with default
        console.warn('Activity table not available for IP security check');
        recentFailedAttempts = 0;
      }

      if (recentFailedAttempts > 10) {
        return {
          allowed: false,
          reason: 'Too many failed attempts from this IP',
          risk: 'high'
        };
      }

      // Check for user-specific IP restrictions (if implemented)
      if (userId) {
        // Could implement user-specific IP whitelisting here
        // For now, we'll allow all IPs for authenticated users
      }

      return {
        allowed: true,
        risk: recentFailedAttempts > 5 ? 'medium' : 'low'
      };
    } catch (error) {
      console.error('Error checking IP security:', error);
      return {
        allowed: true,
        risk: 'unknown'
      };
    }
  }

  // Generate secure session ID
  static generateSecureSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Validate session integrity
  static validateSessionIntegrity(session, userAgent, ip) {
    // Check if session has required properties
    if (!session || !session.userId || !session.createdAt) {
      return false;
    }

    // Check session age (24 hours max)
    const sessionAge = Date.now() - new Date(session.createdAt).getTime();
    if (sessionAge > 24 * 60 * 60 * 1000) {
      return false;
    }

    // Check for session hijacking indicators
    if (session.userAgent && session.userAgent !== userAgent) {
      return false;
    }

    if (session.ip && session.ip !== ip) {
      // Allow IP changes but flag for review
      console.warn(`IP change detected for session: ${session.id}`);
    }

    return true;
  }

  // Device fingerprinting (basic)
  static generateDeviceFingerprint(req) {
    const userAgent = req.get('User-Agent') || '';
    const acceptLanguage = req.get('Accept-Language') || '';
    const acceptEncoding = req.get('Accept-Encoding') || '';
    const ip = req.ip || '';

    // Create a hash of device characteristics
    return crypto
      .createHash('sha256')
      .update(userAgent + acceptLanguage + acceptEncoding + ip)
      .digest('hex');
  }

  // Security audit logging
  async logSecurityEvent(eventType, details, userId = null, req = null) {
    try {
      const clientInfo = req ? AuthUtils.extractClientInfo(req) : {};
      
      await prisma.securityAudit?.create({
        data: {
          eventType,
          details: JSON.stringify(details),
          userId,
          ipAddress: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  // Anomaly detection (basic implementation)
  async detectAnomalies(userId, req) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          lastLogin: true,
          activities: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
              action: true,
              ipAddress: true,
              createdAt: true
            }
          }
        }
      });

      if (!user) return { anomalies: [] };

      const anomalies = [];
      const currentIP = req.ip;
      const currentTime = new Date();

      // Check for unusual IP patterns
      const recentIPs = user.activities
        .map(a => a.ipAddress)
        .filter(ip => ip && ip !== currentIP);

      if (recentIPs.length > 0 && !recentIPs.includes(currentIP)) {
        anomalies.push({
          type: 'new_ip',
          severity: 'medium',
          description: 'Login from new IP address'
        });
      }

      // Check for unusual timing patterns
      if (user.lastLogin) {
        const timeDiff = currentTime.getTime() - user.lastLogin.getTime();
        const hour = currentTime.getHours();
        
        // Flag logins outside normal hours (assuming 6 AM - 10 PM)
        if (hour < 6 || hour > 22) {
          anomalies.push({
            type: 'unusual_time',
            severity: 'low',
            description: 'Login outside normal hours'
          });
        }
      }

      return { anomalies };
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return { anomalies: [] };
    }
  }
}

module.exports = new SecurityService();