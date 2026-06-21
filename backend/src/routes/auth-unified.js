const express = require('express');
const rolesAuth = require('./auth-roles');
const enhancedAuth = require('./auth-enhanced');
const legacyAuth = require('./auth');

const router = express.Router();

router.use(rolesAuth);
router.use('/roles', rolesAuth);
router.use('/account', enhancedAuth);
router.use('/v2', enhancedAuth);
router.use(legacyAuth);

module.exports = router;
