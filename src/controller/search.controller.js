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
    console.log(term);
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
    console.log(newsList?.news);
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
      },
    });

    const testingList = await Testing.findAll({
      where: { categoryPostSubdivisionId: { $in: testingIds?.map((testId) => testId?.id) }, name: { $like: term + '%' } },
    });
    let count = 0;
    if (newsList?.news?.length) {
      count += newsList?.news?.length;
    }
    if (testingList?.length) {
      count += testingList?.length;
    }
    if (studyList?.news?.length) {
      count += studyList?.news?.length;
    }
    const result = {
      news: newsList?.news,
      testing: testingList,
      study: studyList?.news,
      count: count,
    };

    res.json(result);
  }
}
module.exports = new NewsController();
