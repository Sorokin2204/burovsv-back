const db = require('../models');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const jwt = require('jsonwebtoken');
const { CustomError, TypeError } = require('../models/customError.model');
const { default: axios } = require('axios');
const NewsFilter = db.newsFilters;
const NewsType = db.newsTypes;
class NewsFilterController {
  async createNewsFilter(req, res) {
    const { name, newsTypeId } = req.body;
    const findNewsType = await NewsType.findOne({
      where: {
        id: newsTypeId,
      },
    });
    if (!findNewsType) {
      throw new CustomError(404, TypeError.NOT_FOUND);
    }
    const findNewsFilter = await NewsFilter.findOne({
      where: {
        name,
        newsTypeId,
      },
    });
    if (findNewsFilter) {
      throw new CustomError(400, TypeError.ALREADY_EXISTS);
    }
    const newsFilter = {
      name,
      newsTypeId,
    };
    const eq = await NewsFilter.create(newsFilter);

    res.json(eq);
  }
}

module.exports = new NewsFilterController();
