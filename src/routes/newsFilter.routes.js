const Router = require('express');
const newsController = require('../controller/news.controller');
var bodyParser = require('body-parser');

const router = new Router();
const auth = require('../middleware/auth');
const authAdmin = require('../middleware/authAdmin');
const { errorWrapper } = require('../middleware/customError');
const upload = require('../middleware/multer');
const newsFilterController = require('../controller/newsFilter.controller');

router.post('/news-filter/create', errorWrapper(newsFilterController.createNewsFilter));

module.exports = router;
