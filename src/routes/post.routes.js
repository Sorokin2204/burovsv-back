const Router = require('express');
const postController = require('../controller/post.controller');
const router = new Router();
const { errorWrapper } = require('../middleware/customError');

router.get('/post/sync', errorWrapper(postController.syncPosts));
router.get('/post/list', errorWrapper(postController.getPosts));

router.get('/test/employee', errorWrapper(postController.getPosts));
router.get('/test/subdivision', errorWrapper(postController.getPosts));
router.get('/test/post', errorWrapper(postController.testPost));
router.get('/test/employee', errorWrapper(postController.testEmployee));
router.get('/test/subdivision', errorWrapper(postController.testSubdivision));

module.exports = router;
