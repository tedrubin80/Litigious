const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { registrationGuard } = require('../middleware/registrationGuard');
const { sendAuthResponse } = require('../lib/authCookies');
const AuthUtils = require('../lib/authUtils');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');

router.post('/register', registrationGuard, async (req, res) => {
  try {
    const { email, password, name, role = 'PARALEGAL' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const normalizedRole = String(role).toUpperCase();
    const allowedRoles = ['PARALEGAL', 'ATTORNEY', 'ASSISTANT', 'CLIENT'];
    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role for registration'
      });
    }

    const hashedPassword = await AuthUtils.hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: normalizedRole
      }
    });

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userWithoutPassword } = newUser;
    return sendAuthResponse(res, {
      token,
      user: userWithoutPassword,
      statusCode: 201
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
