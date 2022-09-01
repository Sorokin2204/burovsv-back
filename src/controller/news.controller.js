const db = require('../models');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');
const jwt = require('jsonwebtoken');
var mime = require('mime-types');
var moment = require('moment');
fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { CustomError, TypeError } = require('../models/customError.model');
const { default: axios } = require('axios');
const paginate = require('../utils/paginate');
const News = db.news;
const Post = db.posts;
const NewsPost = db.newsPosts;
const Employee = db.employees;
const PostSubdivision = db.postSubdivisions;
const NewsFilter = db.newsFilters;
const NewsType = db.newsTypes;
class NewsController {
  async getNewsSingleUser(req, res) {
    const { newsId } = req.params;
    const findNews = await News.findOne({
      where: { id: newsId },
      include: [{ model: NewsFilter }],
    });
    res.json(findNews);
  }
  async getNewsSingleAdmin(req, res) {
    const { newsId } = req.params;
    const findNews = await News.findOne({
      where: { id: newsId },
      include: [
        {
          model: Post,
        },
        { model: NewsFilter },
      ],
    });
    res.json(findNews);
  }

  async deleteNews(req, res) {
    const { newsId } = req.body;
    await News.update(
      { active: false },
      {
        where: { id: newsId },
      },
    );
    res.json({ success: true });
  }
  async getNewsUser(req, res) {
    const { newsFilterId } = req.params;
    const { newsTypeId, page } = req.query;
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
    const findNewsPosts = await NewsPost.findAll({
      where: {
        postId: employee?.postSubdivision?.postId,
      },
    });
    if (findNewsPosts?.length === 0) {
      throw new CustomError(404, TypeError.NOT_FOUND);
    }
    const newsCount = await News.count({
      id: {
        $in: findNewsPosts?.map((posts) => posts?.newsId),
      },
      where: {
        ...(newsTypeId == 1 && {
          dateEnd: {
            $gte: new Date(),
          },
        }),

        active: true,
      },
      include: [
        {
          model: NewsFilter,
          where: {
            newsTypeId,
          },
          ...(newsFilterId != 0 && {
            where: {
              id: newsFilterId,
            },
          }),
        },
      ],
    });
    const findNews = await News.findAll(
      paginate(
        {
          order: [['createdAt', 'DESC']],

          where: {
            id: {
              $in: findNewsPosts?.map((posts) => posts?.newsId),
            },
            ...(newsTypeId == 1 && {
              dateEnd: {
                $gte: new Date(),
              },
            }),
            active: true,
          },
          include: [
            {
              model: NewsFilter,
              where: {
                newsTypeId,
              },
              ...(newsFilterId != 0 && {
                where: {
                  id: newsFilterId,
                },
              }),
            },
          ],
        },
        { page, pageSize: newsTypeId == 1 ? 8 : 6 },
      ),
    );

    res.json({ count: newsCount, list: findNews });
  }
  async getNews(req, res) {
    const { page, search } = req.query;
    const newsCount = await News.count();

    const newsList = await News.findAll(
      paginate(
        {
          order: [['createdAt', 'DESC']],
          where: {
            title: { $like: search + '%' },
          },
          include: [
            {
              model: NewsFilter,
              attributes: ['name'],
              include: [
                {
                  model: NewsType,
                  attributes: ['name'],
                },
              ],
            },
          ],
        },
        { page, pageSize: 10 },
      ),
    );

    res.json({ count: newsCount, list: newsList });
  }

  async createNews(req, res) {
    const { postIds } = req.body;
    const postIdsArr = postIds.split(',');
    const data = await validateBodyNews(req.body, req.file);
    const newNews = await News.create(data);
    const newsPosts = postIdsArr.map((postId) => ({ postId, newsId: newNews?.id }));
    await NewsPost.bulkCreate(newsPosts);
    return res.status(200).json({});
  }

  async updateNews(req, res) {
    const { id, postIds } = req.body;
    const findNews = await News.findOne({
      where: {
        id,
      },
    });
    if (!findNews) {
      throw new CustomError(404, TypeError.NOT_FOUND);
    }

    if (req.file && findNews?.image) {
      const imagePath = path.join(path.resolve('./'), '/public/images');
      const imageFullPath = path.resolve(`${imagePath}/${findNews?.image}`);
      fs.exists(imageFullPath, function (exists) {
        if (exists) {
          fs.unlinkSync(imageFullPath);
        }
      });
    }
    const data = await validateBodyNews(req.body, req.file);

    const newNews = await News.update(data, { where: { id } });
    await NewsPost.destroy({
      where: {
        newsId: id,
      },
    });
    const newsPosts = postIds.split(',').map((postId) => ({ postId, newsId: id }));
    await NewsPost.bulkCreate(newsPosts);
    res.json({ success: true });
  }
}
async function validateBodyNews({ title, desc, descShort, filterId, postIds, dateEnd }, fileUpload) {
  const postIdsArr = postIds.split(',');
  let news = {
    title,
    desc,
    descShort,
    dateStart: null,
    dateEnd: null,
  };

  const date = moment(dateEnd, 'DD.MM.YYYY', true);
  if ((!date.isValid() && dateEnd) || !desc || !title || !descShort || postIdsArr?.length == 0 || !Array.isArray(postIdsArr)) {
    throw new CustomError(401, TypeError.PARAMS_INVALID);
  }
  if (date.isValid() && dateEnd) {
    news = { ...news, dateStart: new Date(), dateEnd: date };
  }
  const findPosts = await Post.findAll({
    where: {
      id: postIdsArr,
    },
  });
  if (findPosts?.length !== postIdsArr?.length) {
    throw new CustomError(404, TypeError.NOT_FOUND);
  }
  const findNewsFilter = await NewsFilter.findOne({
    where: {
      id: filterId,
    },
  });
  if (!findNewsFilter) {
    throw new CustomError(404, TypeError.NOT_FOUND);
  }
  news = { ...news, newsFilterId: filterId };

  if (fileUpload) {
    const imagePath = path.join(path.resolve('./'), '/public/images');
    const imageExtension = mime.extension(fileUpload.mimetype);
    const imageGenName = `${uuidv4()}.${imageExtension}`;
    const imageFullPath = path.resolve(`${imagePath}/${imageGenName}`);
    news = { ...news, image: imageGenName };
    fs.writeFile(imageFullPath, fileUpload.buffer, function (err) {
      if (err) throw new CustomError();
    });
  }
  return news;
}
module.exports = new NewsController();
