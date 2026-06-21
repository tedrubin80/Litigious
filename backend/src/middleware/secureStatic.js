const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('./auth');

const resolvePathWithinRoot = (rootDir, requestPath) => {
  const normalizedRoot = path.resolve(rootDir);
  const resolvedPath = path.resolve(normalizedRoot, path.normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, ''));

  if (!resolvedPath.startsWith(normalizedRoot + path.sep) && resolvedPath !== normalizedRoot) {
    return null;
  }

  return resolvedPath;
};

const createSecureStaticMiddleware = (rootDir, options = {}) => {
  const absoluteRoot = path.resolve(rootDir);

  return [
    authenticateToken,
    (req, res) => {
      const filePath = resolvePathWithinRoot(absoluteRoot, req.path);

      if (!filePath) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      fs.stat(filePath, (error, stats) => {
        if (error || !stats.isFile()) {
          return res.status(404).json({
            success: false,
            message: 'File not found'
          });
        }

        if (options.requireAdmin && req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
          return res.status(403).json({
            success: false,
            message: 'Admin access required'
          });
        }

        res.sendFile(filePath);
      });
    }
  ];
};

module.exports = {
  createSecureStaticMiddleware,
  resolvePathWithinRoot
};
