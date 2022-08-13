const Router = require('express');
const subdivisionController = require('../controller/subdivision.controller');
const authAdmin = require('../middleware/authAdmin');
const router = new Router();
const { errorWrapper } = require('../middleware/customError');

router.get('/subdivision/sync', errorWrapper(subdivisionController.syncSubdivisions));
router.get('/subdivision/list', errorWrapper(authAdmin), errorWrapper(subdivisionController.getSubdivisions));
router.get('/subdivision/:id', errorWrapper(authAdmin), errorWrapper(subdivisionController.getSubdivision));
module.exports = router;
