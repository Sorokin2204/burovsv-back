const db = require('../models');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const jwt = require('jsonwebtoken');
const { CustomError, TypeError } = require('../models/customError.model');
const { default: axios } = require('axios');
const { parseInt } = require('lodash');
const isValidUUID = require('../utils/isValidUUID');
const getFirstPartUUID = require('../utils/getFirstPartUUID');
const paginate = require('../utils/paginate');
const Employee = db.employees;
const Post = db.posts;
const Category = db.categories;
const Subdivision = db.subdivisions;
const PostSubdivision = db.postSubdivisions;
const CategoryPostSubdivision = db.categoryPostSubdivisions;
class EmployeeController {
  async getEmployee(req, res) {
    const { id } = req.params;
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
    res.json(employee);
  }
  async getEmployees(req, res) {
    const { page, search } = req.query;

    const employeeList = await Employee.findAll(
      paginate(
        {
          where: {
            $or: [{ firstName: { $like: search + '%' } }, { lastName: { $like: search + '%' } }, { idService: { $startWith: search + '%' } }],
          },
          include: [
            {
              model: PostSubdivision,
              as: 'postSubdivision',
            },
          ],
        },
        { page, pageSize: 4 },
      ),
    );
    res.json(employeeList);
  }

  async syncEmployees(req, res) {
    const dataFrom1C = await axios
      .get('http://localhost:3004/employee')
      .then((res) => res.data)
      .catch((err) => {
        throw new CustomError();
      });

    const formatData = formatEmployees(dataFrom1C);
    await upsertEmployees(formatData);
    await disableEmployees(formatData);

    res.json(formatData);
  }
  async updateEmployee(req, res) {
    const { id, coefficient, categoryPostSubdivisionIds } = req.body;
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
          id: categoryPostSubdivisionIds,
        },
      },
    );
    await CategoryPostSubdivision.update(
      { active: false },
      {
        where: {
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

    res.json();
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
    .filter(({ ID, last_name, first_name, tel, ID_post, ID_city }) => ID && isValidUUID(ID) && last_name && first_name && !isNaN(parseInt(tel)) && tel != '0' && ID_post && ID_city)
    .map(({ ID, last_name, first_name, tel, ID_post, ID_city }) => ({ idService: ID, firstName: first_name, lastName: last_name, tel: tel, postId: ID_post, subdivisionId: ID_city }));
}
function upsertEmployees(data) {
  return Promise.all(
    data.map((item) => {
      return checkEmployees(item);
    }),
  );
}
async function disableEmployees(data) {
  const ids = data.map(({ idService }) => idService);
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
console.log(process.env.DIRECTOR_UUID);
async function checkEmployees({ idService, firstName, lastName, tel, postId, subdivisionId }) {
  let postSubdivision;
  let role = idService === process.env.DIRECTOR_UUID ? 'admin' : 'user';
  let coefficient = 1;
  let employee = {
    idService,
    firstName,
    lastName,
    role,
    tel,
  };
  const findSubdivision = await Subdivision.findOne({
    where: { idService: subdivisionId },
  });
  if (!findSubdivision) {
    return true;
  }
  const findPost = await Post.findOne({
    where: { idService: postId },
  });
  if (!findPost) {
    return true;
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
    return Employee.create(employee);
  }
  if (findEmployee?.postSubdivisionId === postSubdivision?.id) {
    coefficient = findEmployee?.coefficient;
  }
  employee = { ...employee, coefficient, postSubdivisionId: postSubdivision?.id };

  return Employee.update(employee, {
    where: { idService },
  });
}
module.exports = new EmployeeController();
