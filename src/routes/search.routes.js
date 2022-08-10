const Router = require('express');
const searchController = require('../controller/search.controller');

const router = new Router();
const { errorWrapper } = require('../middleware/customError');

router.get('/search/', errorWrapper(searchController.globalSearch));
module.exports = router;
