const db = require('../models');
const { CustomError, TypeError } = require('../models/customError.model');
const jwt = require('jsonwebtoken');
const validUrl = require('valid-url');
const moment = require('moment');
const paginate = require('../utils/paginate');
const CategoryPostSubdivision = db.categoryPostSubdivisions;
const PostSubdivision = db.postSubdivisions;
const Category = db.categories;
const Testing = db.testings;
const Employee = db.employees;
const Post = db.posts;
class TestingController {
  async deleteTesting(req, res) {
    const { testingId } = req.body;
    const findTesting = await Testing.findOne({
      where: { id: testingId },
    });

    await Testing.update(
      { active: false },
      {
        where: { id: testingId },
      },
    );
    await CategoryPostSubdivision.update(
      { active: false },
      {
        where: { id: findTesting?.categoryPostSubdivisionId },
      },
    );
    res.json({ success: true });
  }
  async getTestingsUser(req, res) {
    const { id } = req.params;
    const { page } = req.query;
    if (id == 0) {
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
      });

      const findCatSubdivByIds = await CategoryPostSubdivision.findAll({
        where: {
          active: true,
          postSubdivisionId: employee?.postSubdivisionId,
        },
      });

      const tesintCount = await Testing.count({
        where: {
          categoryPostSubdivisionId: { $in: findCatSubdivByIds.map((item) => item?.id) },
          active: true,
        },
      });

      const testingList = await Testing.findAll(
        paginate(
          {
            where: {
              categoryPostSubdivisionId: { $in: findCatSubdivByIds.map((item) => item?.id) },
              active: true,
            },
          },
          { page, pageSize: 4 },
        ),
      );
      res.json({ count: tesintCount, list: testingList });
    } else {
      const findTestingCount = await Testing.count({
        where: { active: true, categoryPostSubdivisionId: id },
      });
      const findTestings = await Testing.findAll(
        paginate(
          {
            where: { active: true, categoryPostSubdivisionId: id },
          },
          { page, pageSize: 4 },
        ),
      );
      res.json({ count: findTestingCount, list: findTestings });
    }
  }

  async getTestingSingleUser(req, res) {
    const { id } = req.params;

    const findTesting = await Testing.findOne({
      where: { categoryPostSubdivisionId: id },
    });
    res.json(findTesting);
  }

  async getTestingSingleAdmin(req, res) {
    const { id } = req.params;
    let testingWithSubdiv;
    const findTesting = await Testing.findOne({
      where: { categoryPostSubdivisionId: id },
      include: [
        {
          model: CategoryPostSubdivision,
        },
      ],
    });
    const findSubdiv = await PostSubdivision.findOne({
      where: { id: findTesting?.categoryPostSubdivision?.postSubdivisionId },
    });
    testingWithSubdiv = { ...findTesting.toJSON(), subdivision: { ...findSubdiv.toJSON() } };
    res.json(testingWithSubdiv);
  }
  async getTestings(req, res) {
    const { page, search } = req.query;
    let employeeListWithCat = [];
    const employeeCount = await Testing.count();
    const employeeList = await Testing.findAll(
      paginate(
        {
          where: {
            name: { $like: search + '%' },
          },
          include: [
            {
              model: CategoryPostSubdivision,
            },
          ],
        },
        { page, pageSize: 4 },
      ),
    );
    for (let testItem of employeeList) {
      const findCat = await Category.findOne({
        where: { id: testItem?.categoryPostSubdivision?.categoryId },
      });
      employeeListWithCat.push({ ...testItem.toJSON(), category: findCat?.name });
    }
    res.json({ count: employeeCount, list: employeeListWithCat });
  }

  async createTesting(req, res) {
    const { name, desc, dateEnd, linkTest, postId, subdivisionId, categoryId } = req.body;
    let catPostSubId;
    await validateBodyTesting(req.body);
    const findPostSubdivision = await PostSubdivision.findOne({
      where: {
        postId,
        subdivisionId,
      },
    });
    const findCatPostSub = await CategoryPostSubdivision.findOne({
      categoryId,
      postSubdivisionId: findPostSubdivision?.id,
    });
    catPostSubId = findCatPostSub?.id;
    if (!findCatPostSub) {
      const newCategoryPostSubdivision = await CategoryPostSubdivision.create({
        categoryId,
        postSubdivisionId: findPostSubdivision?.id,
      });
      catPostSubId = newCategoryPostSubdivision?.id;
    }

    const testing = { name, desc, dateEnd: moment(dateEnd, 'DD.MM.YYYY'), dateStart: new Date(), linkTest, categoryPostSubdivisionId: catPostSubId };
    const newCategory = await Testing.create(testing);
    res.json({ success: true });
  }

  async updateTesting(req, res) {
    const { id, name, desc, dateEnd, linkTest, postId, subdivisionId, categoryId } = req.body;
    const findTesting = await Testing.findOne({
      where: { id },
    });
    if (!findTesting) {
      throw new CustomError(404, TypeError.NOT_FOUND);
    }

    await validateBodyTesting(req.body);
    await CategoryPostSubdivision.destroy({
      where: {
        id: findTesting?.categoryPostSubdivisionId,
      },
    });
    const findPostSubdivision = await PostSubdivision.findOne({
      where: {
        postId,
        subdivisionId,
      },
    });
    const newCategoryPostSubdivision = await CategoryPostSubdivision.create({
      categoryId,
      postSubdivisionId: findPostSubdivision?.id,
    });
    const testing = { name, desc, dateEnd: moment(dateEnd, 'DD.MM.YYYY'), linkTest, categoryPostSubdivisionId: newCategoryPostSubdivision?.id };
    await Testing.update(testing, { where: { id } });
    res.json({ success: true });
  }
}

async function validateBodyTesting({ name, desc, dateEnd, linkTest, postId, subdivisionId, categoryId }) {
  const date = moment(dateEnd, 'DD.MM.YYYY', true);
  if (!date.isValid() || !desc || !name || !validUrl.isHttpsUri(linkTest)) {
    throw new CustomError(401, TypeError.PARAMS_INVALID);
  }
  const findCategory = await Category.findOne({
    where: {
      id: categoryId,
    },
  });
  if (!findCategory) {
    throw new CustomError(404, TypeError.NOT_FOUND);
  }
  const findPostSubdivision = await PostSubdivision.findOne({
    where: {
      postId,
      subdivisionId,
    },
  });
  if (!findPostSubdivision) {
    throw new CustomError(404, TypeError.NOT_FOUND);
  }
}
module.exports = new TestingController();
