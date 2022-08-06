const db = require('../models');
const { CustomError, TypeError } = require('../models/customError.model');
const validUrl = require('valid-url');
const moment = require('moment');
const paginate = require('../utils/paginate');
const CategoryPostSubdivision = db.categoryPostSubdivisions;
const PostSubdivision = db.postSubdivisions;
const Category = db.categories;
const Testing = db.testings;
class TestingController {
  async getTestings(req, res) {
    const { page, search } = req.query;

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
    res.json(employeeList);
  }

  async createTesting(req, res) {
    const { name, desc, dateEnd, linkTest, postId, subdivisionId, categoryId } = req.body;
    await validateBodyTesting(req.body);
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
    const testing = { name, desc, dateEnd: moment(dateEnd, 'DD.MM.YYYY'), dateStart: new Date(), linkTest, categoryPostSubdivisionId: newCategoryPostSubdivision?.id };
    const newCategory = await Testing.create(testing);
    res.json();
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
    res.json();
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
