const { Resend } = require('resend');
const crypto = require('crypto');

class EmailService {
  constructor() {
    // Initialize Resend with API key
    this.resend = new Resend(process.env.RESEND_API_KEY || '');
    console.log('📧 Resend email service initialized');
  }


  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: process.env.FROM_EMAIL || 'Litigious <noreply@litigious.online>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html
      });

      if (error) {
        console.error('Resend email error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      console.log('📧 Email sent via Resend:', data.id);

      return {
        success: true,
        messageId: data.id,
        data: data
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendWelcomeEmail(user, tempPassword = null) {
    const subject = 'Welcome to Litigious Management System';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Welcome to Litigious</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .credentials { background: white; padding: 20px; border-radius: 5px; border-left: 4px solid #28a745; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="header">
              <h1>Welcome to Litigious</h1>
              <p>Your Legal Practice Management System</p>
          </div>
          <div class="content">
              <h2>Hello ${user.name}!</h2>
              <p>Welcome to Litigious Management System. Your account has been successfully created.</p>
              
              <div class="credentials">
                  <h3>Your Account Details:</h3>
                  <p><strong>Email:</strong> ${user.email}</p>
                  <p><strong>Role:</strong> ${user.role}</p>
                  ${tempPassword ? `<p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>` : ''}
              </div>

              ${tempPassword ? `
                  <p><strong>Important:</strong> Please log in and change your password immediately for security.</p>
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">
                      Login to Your Account
                  </a>
              ` : `
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">
                      Access Your Account
                  </a>
              `}
              
              <h3>Getting Started:</h3>
              <ul>
                  <li>Complete your profile information</li>
                  <li>Explore the dashboard and features</li>
                  <li>Set up your preferences</li>
                  <li>Contact your administrator for any questions</li>
              </ul>
              
              <p>If you need assistance, please contact our support team.</p>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Litigious Management System. All rights reserved.</p>
          </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to Litigious Management System!
      
      Hello ${user.name},
      
      Your account has been successfully created with the following details:
      - Email: ${user.email}
      - Role: ${user.role}
      ${tempPassword ? `- Temporary Password: ${tempPassword}` : ''}
      
      Please log in at: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login
      
      ${tempPassword ? 'Important: Please change your password immediately after logging in.' : ''}
      
      Best regards,
      Litigious Team
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      html,
      text
    });
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const subject = 'Password Reset - Litigious';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Password Reset</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; color: #856404; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="header">
              <h1>Password Reset Request</h1>
              <p>Litigious Management System</p>
          </div>
          <div class="content">
              <h2>Hello ${user.name},</h2>
              <p>You requested a password reset for your Litigious account.</p>
              
              <a href="${resetUrl}" class="button">Reset Your Password</a>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: white; padding: 10px; border-radius: 3px; font-family: monospace;">
                  ${resetUrl}
              </p>
              
              <div class="warning">
                  <strong>Important:</strong>
                  <ul>
                      <li>This link will expire in 1 hour for security</li>
                      <li>If you didn't request this reset, please ignore this email</li>
                      <li>Your current password remains unchanged until you set a new one</li>
                  </ul>
              </div>
              
              <p>If you continue to have problems, please contact your administrator.</p>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Litigious Management System. All rights reserved.</p>
          </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request - Litigious
      
      Hello ${user.name},
      
      You requested a password reset for your Litigious account.
      
      Please click the following link to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour for security.
      
      If you didn't request this reset, please ignore this email.
      Your current password remains unchanged until you set a new one.
      
      Best regards,
      Litigious Team
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      html,
      text
    });
  }

  async sendEmailVerification(user, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    const subject = 'Verify Your Email - Litigious';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Verify Your Email</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="header">
              <h1>Verify Your Email</h1>
              <p>Litigious Management System</p>
          </div>
          <div class="content">
              <h2>Hello ${user.name},</h2>
              <p>Please verify your email address to complete your account setup.</p>
              
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: white; padding: 10px; border-radius: 3px; font-family: monospace;">
                  ${verificationUrl}
              </p>
              
              <p>Once verified, you'll have full access to all features of the Litigious Management System.</p>
              
              <p>If you didn't create this account, please ignore this email.</p>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Litigious Management System. All rights reserved.</p>
          </div>
      </body>
      </html>
    `;

    const text = `
      Email Verification - Litigious
      
      Hello ${user.name},
      
      Please verify your email address to complete your account setup.
      
      Click the following link to verify your email:
      ${verificationUrl}
      
      Once verified, you'll have full access to all features of the Litigious Management System.
      
      If you didn't create this account, please ignore this email.
      
      Best regards,
      Litigious Team
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      html,
      text
    });
  }

  async sendLoginAlert(user, loginDetails) {
    const subject = 'New Login Alert - Litigious';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Login Alert</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #17a2b8; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
              .details { background: white; padding: 20px; border-radius: 5px; border-left: 4px solid #17a2b8; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="header">
              <h1>Login Alert</h1>
              <p>Litigious Management System</p>
          </div>
          <div class="content">
              <h2>Hello ${user.name},</h2>
              <p>We detected a new login to your Litigious account.</p>
              
              <div class="details">
                  <h3>Login Details:</h3>
                  <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                  <p><strong>IP Address:</strong> ${loginDetails.ip || 'Unknown'}</p>
                  <p><strong>User Agent:</strong> ${loginDetails.userAgent || 'Unknown'}</p>
              </div>
              
              <p>If this was you, no action is needed. If you don't recognize this login, please:</p>
              <ul>
                  <li>Change your password immediately</li>
                  <li>Contact your administrator</li>
                  <li>Review your account activity</li>
              </ul>
              
              <p>Stay secure!</p>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Litigious Management System. All rights reserved.</p>
          </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject,
      html
    });
  }
}

module.exports = new EmailService();