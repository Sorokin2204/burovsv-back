const db = require('../models');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const jwt = require('jsonwebtoken');
const { CustomError, TypeError } = require('../models/customError.model');
const { default: axios } = require('axios');
const TestingFilter = db.testingFilters;
const Employee = db.employees;
const PostSubdivision = db.postSubdivisions;
const Category = db.categories;

class TestingFilterController {
  async createTestingFilter(req, res) {
    const { name } = req.body;

    const testingFilter = {
      name,
    };
    const eq = await TestingFilter.create(testingFilter);
    res.json(eq);
  }
  async getTestingsFiltersUser(req, res) {
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
      include: {
        model: PostSubdivision,
        include: {
          model: Category,
        },
      },
    });

    // const data = await TestingFilter.findAll();
    res.json(employee?.postSubdivision?.categories);
  }
  async getTestingsFilters(req, res) {
    const data = await TestingFilter.findAll();
    res.json(data);
  }
}

module.exports = new TestingFilterController();
