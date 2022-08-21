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
const { parseInt } = require('lodash');
const isValidUUID = require('../utils/isValidUUID');
const getFirstPartUUID = require('../utils/getFirstPartUUID');
const paginate = require('../utils/paginate');
const getDataFromToken = require('../utils/getDataFromToken');
const Employee = db.employees;
const Post = db.posts;
const Category = db.categories;
const Subdivision = db.subdivisions;
const PostSubdivision = db.postSubdivisions;
const CategoryPostSubdivision = db.categoryPostSubdivisions;
class EmployeeController {
  async syncGlobal(req, res) {
    await axios.get(`${process.env.SERVER_DOMAIN}/api/post/sync`);
    await axios.get(`${process.env.SERVER_DOMAIN}/api/subdivision/sync`);
    await axios.get(`${process.env.SERVER_DOMAIN}/api/employee/sync`);
    res.json({ success: true });
  }
  async deleteEmployee(req, res) {
    const { employeeId } = req.body;
    await Employee.update(
      { active: false },
      {
        where: { id: employeeId },
      },
    );
    res.json({ success: true });
  }

  async authAdmin(req, res) {
    res.json({ success: 'ok' });
  }
  async uploadAvatar(req, res) {
    const employee = await getDataFromToken(req);
    if (!employee) {
      throw new CustomError(401, TypeError.NOT_FOUND);
    }
    if (!req.file) {
      throw new CustomError(401, TypeError.PARAMS_INVALID);
    }
    let imageGenName;
    if (req.file) {
      const imagePath = path.join(path.resolve('./'), '/public/images');
      const imageExtension = mime.extension(req.file.mimetype);
      imageGenName = `${uuidv4()}.${imageExtension}`;
      const imageFullPath = path.resolve(`${imagePath}/${imageGenName}`);
      fs.writeFile(imageFullPath, req.file.buffer, function (err) {
        if (err) throw new CustomError();
      });
    }
    if (req.file && employee?.image) {
      const imagePath = path.join(path.resolve('./'), '/public/images');
      const imageFullPath = path.resolve(`${imagePath}/${employee?.image}`);
      fs.exists(imageFullPath, function (exists) {
        if (exists) {
          fs.unlinkSync(imageFullPath);
        }
      });
    }
    await Employee.update(
      { image: imageGenName },
      {
        where: {
          id: employee?.id,
        },
      },
    );
    res.json({ success: true });
  }
  async authEmployee(req, res) {
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
    const findEmployee = await Employee.findOne({
      attributes: { exclude: ['password'] },
      where: { active: true, idService: tokenData.id },
      include: {
        model: PostSubdivision,
        attributes: ['postId', 'subdivisionId'],
      },
    });
    if (!findEmployee) {
      throw new CustomError(403, TypeError.PROBLEM_WITH_TOKEN);
    }
    const findPost = await Post.findOne({
      where: {
        active: true,
        id: findEmployee?.postSubdivision?.postId,
      },
    });
    if (!findPost) {
      throw new CustomError(404, TypeError.NOT_FOUND);
    }
    const findSubdivision = await Subdivision.findOne({
      where: {
        active: true,
        id: findEmployee?.postSubdivision?.subdivisionId,
      },
    });
    if (!findSubdivision) {
      throw new CustomError(404, TypeError.NOT_FOUND);
    }

    res.json({ ...findEmployee.toJSON(), post: findPost?.name, subdivision: findSubdivision?.name });
  }
  async getEmployeeUser(req, res) {
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
    let employeeExtand = {};
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

    const findPost = await Post.findOne({
      where: { id: employee?.postSubdivision?.postId },
    });
    const findSubdivision = await Subdivision.findOne({
      where: { id: employee?.postSubdivision?.subdivisionId },
    });
    employeeExtand = { ...employee.toJSON(), post: findPost?.name, subdivision: findSubdivision?.name };
    res.json(employeeExtand);
  }
  async getEmployee(req, res) {
    const { id } = req.params;
    let employeeExtand = {};
    const employee = await Employee.findOne({
      where: {
        id,
      },
      include: [
        {
          model: PostSubdivision,
          include: [
            {
              model: Category,
            },
          ],
        },
      ],
    });

    const findPost = await Post.findOne({
      where: { id: employee?.postSubdivision?.postId },
    });
    const findSubdivision = await Subdivision.findOne({
      where: { id: employee?.postSubdivision?.subdivisionId },
    });
    employeeExtand = { ...employee.toJSON(), post: findPost?.name, subdivision: findSubdivision?.name };
    res.json(employeeExtand);
  }
  async getEmployees(req, res) {
    const { page, search } = req.query;
    let employeeListWithPost = [];
    const empolyeesCount = await Employee.count();

    const employeeList = await Employee.findAll(
      paginate(
        {
          ...(search && {
            where: {
              $or: [{ firstName: { $like: search + '%' } }, { lastName: { $like: search + '%' } }, { idService: { $startWith: search + '%' } }],
            },
          }),

          include: [
            {
              model: PostSubdivision,
              as: 'postSubdivision',
            },
          ],
        },
        { page, pageSize: 10 },
      ),
    );

    for (let testItem of employeeList) {
      const findCat = await Post.findOne({
        where: { id: testItem?.postSubdivision?.postId },
      });
      employeeListWithPost.push({ ...testItem.toJSON(), post: findCat?.name });
    }

    res.json({ pages: empolyeesCount, list: employeeListWithPost });
  }

  async syncEmployees(req, res) {
    const dataFrom1C = await axios.get('http://WINNER-SQL/zup_pay/hs/Exch_LP/ListEmployees');

    const formatData = formatEmployees(dataFrom1C);
    await upsertEmployees(formatData);
    await disableEmployees(formatData);

    res.json(formatData);
  }
  async updateEmployee(req, res) {
    const { id, coefficient, categoryPostSubdivisionIds, postSubdivisionId } = req.body;
    const findEmployee = await Employee.findOne({ where: { idService: id } });
    if (!findEmployee) {
      throw new CustomError(404, TypeError.NOT_FOUND);
    }

    const findCategoryPostSubdivisions = await CategoryPostSubdivision.findAll({
      where: {
        id: categoryPostSubdivisionIds,
      },
    });
    if (findCategoryPostSubdivisions?.length !== categoryPostSubdivisionIds?.length) {
      throw new CustomError(404, TypeError.NOT_FOUND);
    }
    await CategoryPostSubdivision.update(
      { active: true },
      {
        where: {
          postSubdivisionId,
          id: categoryPostSubdivisionIds,
        },
      },
    );
    await CategoryPostSubdivision.update(
      { active: false },
      {
        where: {
          postSubdivisionId,
          id: {
            $notIn: categoryPostSubdivisionIds,
          },
        },
      },
    );
    await Employee.update(
      { coefficient },
      {
        where: {
          idService: id,
        },
      },
    );

    res.json({ success: true });
  }
  async loginEmployee(req, res) {
    const { login, password } = req.body;
    const findEmployee = await Employee.findOne({ where: { tel: login, active: true } });
    if (!findEmployee) {
      throw new CustomError(400, TypeError.LOGIN_ERROR);
    }
    const passCheck = await bcrypt.compare(password, findEmployee.password);
    if (!passCheck) {
      throw new CustomError(400, TypeError.LOGIN_ERROR);
    }
    const token = jwt.sign({ id: findEmployee.idService }, process.env.SECRET_TOKEN, { expiresIn: '1h' });
    res.json({ token: token });
  }
}

function formatEmployees(data) {
  return data
    .filter(({ ID, last_name, first_name, tel, ID_post, ID_city }) => ID && last_name && first_name && !isNaN(parseInt(tel)) && parseInt(tel) !== 0 && ID_post && ID_city)
    .map(({ ID, last_name, first_name, tel, ID_post, ID_city }) => ({ idService: ID, firstName: first_name, lastName: last_name, tel: tel, postId: ID_post, subdivisionId: ID_city }));
}
async function upsertEmployees(data) {
  for (let item of data) {
    await checkEmployees(item);
  }
}
async function disableEmployees(data) {
  let ids = data.map(({ idService }) => idService);
  ids.push('1');
  return Employee.update(
    { active: false },
    {
      where: {
        idService: {
          $notIn: ids,
        },
      },
    },
  );
}
async function checkEmployees({ idService, firstName, lastName, tel, postId, subdivisionId }) {
  let postSubdivision;
  let role = 'user';
  let coefficient = 1;
  let employee = {
    active: true,
    idService,
    firstName,
    lastName,
    role,
    tel,
  };
  const findSubdivision = await Subdivision.findOne({
    where: { idService: subdivisionId, active: true },
  });
  if (!findSubdivision) {
    return await Employee.update(
      { active: false },
      {
        where: { idService },
      },
    );
  }
  const findPost = await Post.findOne({
    where: { idService: postId, active: true },
  });
  if (!findPost) {
    return await Employee.update(
      { active: false },
      {
        where: { idService },
      },
    );
  }
  postSubdivision = await PostSubdivision.findOne({
    where: { postId: findPost?.id, subdivisionId: findSubdivision?.id },
  });
  if (!postSubdivision) {
    postSubdivision = await PostSubdivision.create({
      postId: findPost?.id,
      subdivisionId: findSubdivision?.id,
    });
  }
  const findEmployee = await Employee.findOne({
    where: { idService },
  });
  if (!findEmployee) {
    const plainPassword = getFirstPartUUID(idService);
    const password = bcrypt.hashSync(plainPassword, 3);
    employee = { ...employee, password, postSubdivisionId: postSubdivision?.id };
    return await Employee.create(employee);
  }
  if (findEmployee?.postSubdivisionId === postSubdivision?.id) {
    coefficient = findEmployee?.coefficient;
  }
  employee = { ...employee, coefficient, postSubdivisionId: postSubdivision?.id };

  return await Employee.update(employee, {
    where: { idService },
  });
}
module.exports = new EmployeeController();
