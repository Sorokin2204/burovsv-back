const Router = require('express');
const newsController = require('../controller/news.controller');
var bodyParser = require('body-parser');

const router = new Router();
const auth = require('../middleware/auth');
const authAdmin = require('../middleware/authAdmin');
const { errorWrapper } = require('../middleware/customError');
const upload = require('../middleware/multer');

router.post('/news/create', upload.single('image'), errorWrapper(newsController.createNews));
router.post('/news/update', upload.single('image'), errorWrapper(newsController.updateNews));
module.exports = router;

router.get('/news/list', errorWrapper(newsController.getNews));
