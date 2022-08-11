const Router = require('express');
const employeeController = require('../controller/employee.controller');
const upload = require('../middleware/multer');
const router = new Router();
const auth = require('../middleware/auth');
const authAdmin = require('../middleware/authAdmin');
const { errorWrapper } = require('../middleware/customError');

router.get('/employee/sync', errorWrapper(employeeController.syncEmployees));
router.post('/employee/login', errorWrapper(employeeController.loginEmployee));
router.post('/employee/delete', errorWrapper(employeeController.deleteEmployee));

router.post('/employee/upload', errorWrapper(auth), upload.single('image'), errorWrapper(employeeController.uploadAvatar));

router.post('/employee/update', errorWrapper(employeeController.updateEmployee));

router.post('/global/sync', errorWrapper(employeeController.syncGlobal));

router.get('/employee/list', errorWrapper(employeeController.getEmployees));

router.get('/employee/:id', errorWrapper(employeeController.getEmployee));
router.get('/employee/user/get', errorWrapper(employeeController.getEmployeeUser));
router.get('/auth', errorWrapper(auth), errorWrapper(employeeController.authEmployee));
router.get('/auth-admin/', errorWrapper(auth), errorWrapper(authAdmin), errorWrapper(employeeController.authAdmin));

module.exports = router;
