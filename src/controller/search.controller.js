const db = require('../models');
const { CustomError } = require('../models/customError.model');
const News = db.news;
const Post = db.posts;
const NewsFilter = db.newsFilters;
const NewsType = db.newsTypes;
const Testing = db.testings;
const PostSubdivision = db.postSubdivisions;
const Employee = db.employees;
const CategoryPostSubdivision = db.categoryPostSubdivisions;

const jwt = require('jsonwebtoken');
class NewsController {
  async globalSearch(req, res) {
    const { term } = req.query;
    const authHeader = req.headers['request_token'];
    if (!authHeader) {
      throw new CustomError(401, TypeError.PROBLEM_WITH_TOKEN);
    }
    const tokenData = jwt.verify(authHeader, process.env.SECRET_TOKEN, (err, tokenData) => {
      if (err) {
        throw new CustomError(403, TypeError.PROBLEM_WITH_TOKEN);
      }
      return tokenData;
    });
    const employee = await Employee.findOne({
      where: {
        idService: tokenData?.id,
      },
      include: [
        {
          model: PostSubdivision,
        },
      ],
    });
    const newsList = await Post.findOne({
      where: {
        id: employee?.postSubdivision?.postId,
      },
      include: [
        {
          model: News,
          where: { active: true, title: { $like: term + '%' } },
          include: [
            {
              model: NewsFilter,
              where: { newsTypeId: 1 },
            },
          ],
        },
      ],
    });
    const studyList = await Post.findOne({
      where: {
        id: employee?.postSubdivision?.postId,
      },
      include: [
        {
          model: News,
          where: { active: true, title: { $like: term + '%' } },
          include: [
            {
              model: NewsFilter,
              where: { newsTypeId: 2 },
            },
          ],
        },
      ],
    });

    const testingIds = await CategoryPostSubdivision.findAll({
      where: {
        postSubdivisionId: employee?.postSubdivisionId,
        // name: { $like: term + '%' },
      },
    });

    const testingList = await Testing.findAll({
      where: { categoryPostSubdivisionId: { $in: testingIds?.map((testId) => testId?.id) }, name: { $like: term + '%' } },
    });
    console.log(testingList.length);
    const result = {
      news: newsList?.news,
      testing: testingList,
      study: studyList?.news,
      count: newsList?.news?.length + testingList?.length + studyList?.news?.length,
    };
    // console.log(newsList.toJSON());
    res.json(result);
  }
}
module.exports = new NewsController();
