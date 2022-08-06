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
const NewsFilter = db.newsFilters;
const NewsType = db.newsTypes;
class NewsController {
  async getNews(req, res) {
    const { page, search } = req.query;

    const newsList = await News.findAll(
      paginate(
        {
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
        { page, pageSize: 4 },
      ),
    );
    res.json(newsList);
  }

  async createNews(req, res) {
    const { postIds } = req.body;

    const data = await validateBodyNews(req.body, req.file);
    const newNews = await News.create(data);
    const newsPosts = JSON.parse(postIds).map((postId) => ({ postId, newsId: newNews?.id }));
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

    if ((req.file && findNews?.image) || findNews?.image) {
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
    const newsPosts = JSON.parse(postIds).map((postId) => ({ postId, newsId: id }));
    await NewsPost.bulkCreate(newsPosts);
    res.json();
  }
}
async function validateBodyNews({ title, desc, descShort, filterId, postIds, dateEnd }, image) {
  let news = {
    title,
    desc,
    descShort,
    dateStart: null,
    dateEnd: null,
    image: null,
  };
  console.log(image);
  const date = moment(dateEnd, 'DD.MM.YYYY', true);
  if ((!date.isValid() && dateEnd) || !desc || !title || !descShort || postIds?.length < 1 || !Array.isArray(JSON.parse(postIds))) {
    throw new CustomError(401, TypeError.PARAMS_INVALID);
  }
  if (date.isValid() && dateEnd) {
    news = { ...news, dateStart: new Date(), dateEnd: date };
  }
  const findPosts = await Post.findAll({
    where: {
      id: JSON.parse(postIds),
    },
  });
  if (findPosts?.length !== JSON.parse(postIds)?.length) {
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

  if (image) {
    const imagePath = path.join(path.resolve('./'), '/public/images');
    const imageExtension = mime.extension(image.mimetype);
    const imageGenName = `${uuidv4()}.${imageExtension}`;
    const imageFullPath = path.resolve(`${imagePath}/${imageGenName}`);
    news = { ...news, image: imageGenName };
    fs.writeFile(imageFullPath, image.buffer, function (err) {
      if (err) throw new CustomError();
    });
  }
  return news;
}
module.exports = new NewsController();
