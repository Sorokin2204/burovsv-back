const Router = require('express');
const testingController = require('../controller/testing.controller');
const router = new Router();
const { errorWrapper } = require('../middleware/customError');

router.post('/testing/create', errorWrapper(testingController.createTesting));
router.post('/testing/update', errorWrapper(testingController.updateTesting));

router.get('/testing/list', errorWrapper(testingController.getTestings));
router.get('/testing/:id', errorWrapper(testingController.getTestingsUser));
router.get('/testing/admin/:id', errorWrapper(testingController.getTestingSingleAdmin));
router.get('/testing/user/:id', errorWrapper(testingController.getTestingSingleUser));
router.post('/testing/delete', errorWrapper(testingController.deleteTesting));
module.exports = router;
