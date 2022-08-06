const db = require('../models');
const { CustomError, TypeError } = require('../models/customError.model');

const Category = db.categories;
const Post = db.posts;
const Subdivision = db.subdivisions;
const PostSubdivision = db.postSubdivisions;
const CategoryPostSubdivision = db.categoryPostSubdivisions;
class CategoryController {
  async getCategoriesByPostAndBySubdivision(req, res) {
    const { postId, subdivisionId } = req.params;

    const categories = await PostSubdivision.findOne({
      where: {
        postId,
        subdivisionId,
      },
      include: [
        {
          model: Category,
        },
      ],
    });

    res.json(categories);
  }
  async createCategory(req, res) {
    const { postId, subdivisionId, name } = req.body;
    if (!name) {
      throw new CustomError(401, TypeError.PARAMS_INVALID);
    }

    const findPostSubdivision = await PostSubdivision.findOne({
      where: {
        subdivisionId,
        postId,
      },
    });
    if (!findPostSubdivision) {
      throw new CustomError(404, TypeError.NOT_FOUND);
    }
    const findCategory = await Category.findOne({
      where: {
        name,
      },
    });
    if (findCategory) {
      const findCategoryPostSubdivision = await CategoryPostSubdivision.findOne({
        where: {
          categoryId: findCategory?.id,
          postSubdivisionId: findPostSubdivision?.id,
        },
      });
      if (findCategoryPostSubdivision) {
        throw new CustomError(400, TypeError.ALREADY_EXISTS);
      }
    }
    const newCategory = await Category.create({ name });
    const categoryPostSubdivision = {
      categoryId: newCategory?.id,
      postSubdivisionId: findPostSubdivision?.id,
    };
    await CategoryPostSubdivision.create(categoryPostSubdivision);
    res.json(findPostSubdivision);
  }
}
module.exports = new CategoryController();
