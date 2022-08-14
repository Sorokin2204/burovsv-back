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
    const dataFrom1C = [
      { ID: '32332cb3-98ef-11ea-80c5-a0d3c1ef2117', last_name: 'Иванова', first_name: 'Анжела', tel: '89048977007', ID_post: 'ab1c6a98-382d-11ea-93c4-d89d672bfba0', ID_city: 'ade98481-06e6-11eb-80c9-a0d3c1ef2117' },
      { ID: '0ce4cd45-d13b-11ea-80c6-a0d3c1ef2117', last_name: 'Утенков', first_name: 'Константин', tel: 0, ID_post: 'ab1c6a98-382d-11ea-93c4-d89d672bfba0', ID_city: '57a6b3bf-499a-11eb-80c9-a0d3c1ef2117' },
      { ID: 'd6830f12-d23a-11ea-80c6-a0d3c1ef2117', last_name: 'Нестерова', first_name: 'Натальяяяяяяяяяяяя', tel: '77777777777', ID_post: 'c0f324b6-d0b5-11ea-80c6-a0d3c1ef2117', ID_city: '877454bc-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: '7bb1832e-0a45-11eb-80c9-a0d3c1ef2117', last_name: 'Корелина', first_name: 'Анастасия', tel: 0, ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '57a6b3bf-499a-11eb-80c9-a0d3c1ef2117' },
      { ID: 'd856b987-0ed6-11eb-80c9-a0d3c1ef2117', last_name: 'Митяева', first_name: 'Виктория', tel: '89969327254', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'fa561159-1348-11eb-80c9-a0d3c1ef2117' },
      { ID: '781db3c8-135d-11eb-80c9-a0d3c1ef2117', last_name: 'Романова', first_name: 'Алла', tel: '89138353784', ID_post: 'a6144ded-2008-11ea-93c4-d89d672bfba0', ID_city: '1cde76c6-fcb2-11ea-80c9-a0d3c1ef2117' },
      { ID: '0545965b-1f21-11eb-80c9-a0d3c1ef2117', last_name: 'Щелчкова', first_name: 'Алёна', tel: '89135500623', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '84b4219d-fbc1-11ea-80c9-a0d3c1ef2117' },
      { ID: '13820709-2fcb-11eb-80c9-a0d3c1ef2117', last_name: 'Куклина', first_name: 'Ирина', tel: '89232744749', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'f8d15325-1343-11eb-80c9-a0d3c1ef2117' },
      { ID: '9de12ee4-3dba-11eb-80c9-a0d3c1ef2117', last_name: 'Биче-оол', first_name: 'Шончалай', tel: '89236283330', ID_post: 'c11d1cea-1a27-11ea-93c4-d89d672bfba0', ID_city: 'a022709e-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: '18a3e972-5952-11eb-80ca-a0d3c1ef2117', last_name: 'Сарыг-Донгак', first_name: 'Олча', tel: '79232692955', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'a022709e-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: 'f3cdde21-61e1-11eb-80ca-a0d3c1ef2117', last_name: 'Коняшкина', first_name: 'Ирина', tel: '89235866606', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'fa561159-1348-11eb-80c9-a0d3c1ef2117' },
      { ID: '0b6bea74-7016-11eb-80ca-a0d3c1ef2117', last_name: 'Горшенина', first_name: 'Елена', tel: 0, ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '57a6b3bf-499a-11eb-80c9-a0d3c1ef2117' },
      { ID: '0b6bea75-7016-11eb-80ca-a0d3c1ef2117', last_name: 'Демина', first_name: 'Ирина', tel: 0, ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '57a6b3bf-499a-11eb-80c9-a0d3c1ef2117' },
      { ID: '0b6bea76-7016-11eb-80ca-a0d3c1ef2117', last_name: 'Аранина', first_name: 'Светлана', tel: '89232896708', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '95015495-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: '32afd78b-7652-11eb-80ca-a0d3c1ef2117', last_name: 'Комарова', first_name: 'Виктория', tel: 0, ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'c9882c7d-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: 'b29a7a05-77ec-11eb-80ca-a0d3c1ef2117', last_name: 'Шмакова', first_name: 'Евгения', tel: '89138314844', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '07053afb-1343-11eb-80c9-a0d3c1ef2117' },
      { ID: 'd722e038-8dfb-11eb-80cb-a0d3c1ef2117', last_name: 'Вантеева', first_name: 'Наталья', tel: '89835000713', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '84b4219d-fbc1-11ea-80c9-a0d3c1ef2117' },
      { ID: '927f4ab7-9109-11eb-80cb-a0d3c1ef2117', last_name: 'Паначева', first_name: 'Анна', tel: 0, ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '0e248704-86e9-11eb-80cb-a0d3c1ef2117' },
      { ID: '2ec3b023-9134-11eb-80cb-a0d3c1ef2117', last_name: 'Колтуновская', first_name: 'Олеся', tel: 0, ID_post: 'a6144ded-2008-11ea-93c4-d89d672bfba0', ID_city: '57a6b3bf-499a-11eb-80c9-a0d3c1ef2117' },
      { ID: '8da6d73e-ce5d-11eb-80cb-a0d3c1ef2117', last_name: 'Белоглазова', first_name: 'Екатерина', tel: '89233340987', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '0e248704-86e9-11eb-80cb-a0d3c1ef2117' },
      { ID: '1df5b94a-ce61-11eb-80cb-a0d3c1ef2117', last_name: 'Привалихина', first_name: 'Светлана', tel: '89135071413', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'c9882c7d-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: '6070bd0b-ce62-11eb-80cb-a0d3c1ef2117', last_name: 'Сокуренко', first_name: 'Светлана', tel: 0, ID_post: 'a6144ded-2008-11ea-93c4-d89d672bfba0', ID_city: 'c9882c7d-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: '855d3e2b-da4b-11eb-80cb-a0d3c1ef2117', last_name: 'Березовская', first_name: 'Ирина', tel: '89135967955', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'ba683f30-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: 'd5c6ee64-e92d-11eb-80cb-a0d3c1ef2117', last_name: 'Глухенко', first_name: 'Оксана', tel: '89833767407', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'e0c6fddc-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: '3921415e-eb9f-11eb-80cb-a0d3c1ef2117', last_name: 'Чередниченко', first_name: 'Марина', tel: 0, ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '0e248704-86e9-11eb-80cb-a0d3c1ef2117' },
      { ID: '26e99040-edf1-11eb-80cb-a0d3c1ef2117', last_name: 'Галята', first_name: 'Наталья', tel: '89080144282', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '0e248704-86e9-11eb-80cb-a0d3c1ef2117' },
      { ID: 'e18d9e1d-fe3a-11eb-80cb-a0d3c1ef2117', last_name: 'Гармашева', first_name: 'Анастасия', tel: '89232788736', ID_post: 'ae1b8e5f-a88f-11eb-80cb-a0d3c1ef2117', ID_city: 'c9882c7d-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: 'c21a8105-000c-11ec-80cb-a0d3c1ef2117', last_name: 'Федорова', first_name: 'Екатерина', tel: '89504165739', ID_post: 'c0f324b6-d0b5-11ea-80c6-a0d3c1ef2117', ID_city: '84b4219d-fbc1-11ea-80c9-a0d3c1ef2117' },
      { ID: 'df091447-15eb-11ec-80cb-a0d3c1ef2117', last_name: 'Филимонова', first_name: 'Светлана', tel: 0, ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '877454bc-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: 'a0f6fadf-20dd-11ec-80cb-a0d3c1ef2117', last_name: 'Рябченко', first_name: 'Ольга', tel: '89832047857', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'eceb2598-2279-11ec-80cb-a0d3c1ef2117' },
      { ID: '331f1685-20f5-11ec-80cb-a0d3c1ef2117', last_name: 'Веретнова', first_name: 'Марина', tel: 0, ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'eceb2598-2279-11ec-80cb-a0d3c1ef2117' },
      { ID: 'afb11a59-2c03-11ec-80cb-a0d3c1ef2117', last_name: 'Турушева', first_name: 'Татьяна', tel: '89832496045', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'eceb2598-2279-11ec-80cb-a0d3c1ef2117' },
      { ID: 'e98aad09-4b66-11ec-80cb-a0d3c1ef2117', last_name: 'Коновальцева', first_name: 'Владлена', tel: '89993132256', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '6d292a89-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: 'cc577f50-4c26-11ec-80cb-a0d3c1ef2117', last_name: 'Воробьева', first_name: 'Ольга', tel: '89960528812', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '6d292a89-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: '716cc9cb-572b-11ec-80cb-a0d3c1ef2117', last_name: 'Медведев', first_name: 'Евгений', tel: 0, ID_post: '912e26c9-9f41-11e6-a3d6-00259030ade0', ID_city: '57a6b3bf-499a-11eb-80c9-a0d3c1ef2117' },
      { ID: '8227c24e-5ccc-11ec-80cb-a0d3c1ef2117', last_name: 'Клесова', first_name: 'Анжелика', tel: '89135646416', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'e5b7f72b-4f36-11ec-80cb-a0d3c1ef2117' },
      { ID: 'cfb12947-5d64-11ec-80cb-a0d3c1ef2117', last_name: 'Палкина', first_name: 'Анастасия', tel: 0, ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'e5b7f72b-4f36-11ec-80cb-a0d3c1ef2117' },
      { ID: '80dd2a3a-5d8a-11ec-80cb-a0d3c1ef2117', last_name: 'Плотникова', first_name: 'Мария', tel: '89130398775', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'e5b7f72b-4f36-11ec-80cb-a0d3c1ef2117' },
      { ID: '41fbe332-63bf-11ec-80cb-a0d3c1ef2117', last_name: 'Шарпанова', first_name: 'Светлана', tel: '89135687144', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '1cde76c6-fcb2-11ea-80c9-a0d3c1ef2117' },
      { ID: '04c5f4eb-6d47-11ec-80cb-a0d3c1ef2117', last_name: 'Павлюченко', first_name: 'Татьяна', tel: '89509666323', ID_post: 'a6144ded-2008-11ea-93c4-d89d672bfba0', ID_city: 'e5b7f72b-4f36-11ec-80cb-a0d3c1ef2117' },
      { ID: '42097bb2-6d47-11ec-80cb-a0d3c1ef2117', last_name: 'Сейфуллаева', first_name: 'Измира', tel: '89135739035', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'e5b7f72b-4f36-11ec-80cb-a0d3c1ef2117' },
      { ID: 'fd7e55ff-750a-11ec-80cb-a0d3c1ef2117', last_name: 'Кононова', first_name: 'Светлана', tel: 0, ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'd80d79fc-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: 'b3826c02-7a9f-11ec-80cc-1402ec7abf4d', last_name: 'Ланшаков', first_name: 'Иван', tel: 0, ID_post: '912e26c9-9f41-11e6-a3d6-00259030ade0', ID_city: '57a6b3bf-499a-11eb-80c9-a0d3c1ef2117' },
      { ID: 'e6f67086-8ee7-11ec-80cd-1402ec7abf4d', last_name: 'Уважа', first_name: 'Олчая', tel: '89133429699', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'a022709e-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: 'e0d2a7fe-9ace-11ec-80cd-1402ec7abf4d', last_name: 'Самылин', first_name: 'Александр', tel: 0, ID_post: '912e26c9-9f41-11e6-a3d6-00259030ade0', ID_city: '57a6b3bf-499a-11eb-80c9-a0d3c1ef2117' },
      { ID: '5835b02e-aa67-11ec-80cd-1402ec7abf4d', last_name: 'Бурых', first_name: 'Оксана', tel: '89233279754', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '0e248704-86e9-11eb-80cb-a0d3c1ef2117' },
      { ID: '36e7d23a-eac1-11ec-80cd-1402ec7abf4d', last_name: 'Книгина', first_name: 'Ольга', tel: '89080178405', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'aafc068d-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: '1b01e6d1-f8ef-11ec-80cd-1402ec7abf4d', last_name: 'Рогонова', first_name: 'Оксана', tel: 0, ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'ade98481-06e6-11eb-80c9-a0d3c1ef2117' },
      { ID: '7d70c7ba-fdc2-11ec-80cd-1402ec7abf4d', last_name: 'Севумян', first_name: 'Артем', tel: 0, ID_post: '912e26c9-9f41-11e6-a3d6-00259030ade0', ID_city: '57a6b3bf-499a-11eb-80c9-a0d3c1ef2117' },
      { ID: '15fc6538-0e2a-11ed-80cd-1402ec7abf4d', last_name: 'Шерстюк', first_name: 'Аделина', tel: 0, ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '877454bc-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: 'a5e3a8c0-6e71-11ea-8eb4-d89d672bfba1', last_name: 'Бакеева', first_name: 'Наталья', tel: '89232865578', ID_post: 'a6144ded-2008-11ea-93c4-d89d672bfba0', ID_city: 'e5b7f72b-4f36-11ec-80cb-a0d3c1ef2117' },
      { ID: 'af2700aa-5394-11ea-93c4-d89d672bfba0', last_name: 'Воронина', first_name: 'Юлия', tel: '89233429322', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '07053afb-1343-11eb-80c9-a0d3c1ef2117' },
      { ID: 'b7c77e15-5aa3-11ea-93c4-d89d672bfba0', last_name: 'Стаханова', first_name: 'Ирина', tel: 0, ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '57a6b3bf-499a-11eb-80c9-a0d3c1ef2117' },
      { ID: 'e47c7a46-3e2c-11e9-9522-d89d672bfba0', last_name: 'Борисова', first_name: 'Екатерина', tel: '89233460331', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'd80d79fc-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: '8af70808-4bc4-11e9-9522-d89d672bfba0', last_name: 'Колтуновский', first_name: 'Эдуард', tel: 0, ID_post: '7a0acb6f-9013-11ea-80c5-a0d3c1ef2117', ID_city: '57a6b3bf-499a-11eb-80c9-a0d3c1ef2117' },
      { ID: 'e917b8fa-c48d-11e9-a2a8-d89d672bfba0', last_name: 'Русакова', first_name: 'Гузалия_Одеялкино', tel: 0, ID_post: 'a6144ded-2008-11ea-93c4-d89d672bfba0', ID_city: '1cde76c6-fcb2-11ea-80c9-a0d3c1ef2117' },
      { ID: 'e917b900-c48d-11e9-a2a8-d89d672bfba0', last_name: 'Зарубина', first_name: 'Анжела', tel: '89233676735', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '07053afb-1343-11eb-80c9-a0d3c1ef2117' },
      { ID: 'b786ee10-ac8a-11e6-a3a6-00259030ade0', last_name: 'Климова', first_name: 'Юлия', tel: '89135698113', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '95015495-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: 'fba2d371-6bc3-11e9-a3ec-d89d672bfba0', last_name: 'Заболотская', first_name: 'Юлия', tel: 0, ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '1cde76c6-fcb2-11ea-80c9-a0d3c1ef2117' },
      { ID: 'd5909239-6fff-11e9-a3ec-d89d672bfba0', last_name: 'Новикова', first_name: 'Анастасия', tel: '89832583032', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'fa561159-1348-11eb-80c9-a0d3c1ef2117' },
      { ID: '55fe992a-7927-11e9-a3ec-d89d672bfba0', last_name: 'Глушкина', first_name: 'Ярослава', tel: '89504273476', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '6d292a89-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: 'f9c57cca-7dd0-11e9-a3ec-d89d672bfba0', last_name: 'Пасечник', first_name: 'Ольга', tel: '89232992573', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '6d292a89-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: '9506cbff-01fd-11ea-a967-d89d672bfba0', last_name: 'Шапкина', first_name: 'Юлия', tel: '89233022658', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: '877454bc-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: '57cc0c2b-8a37-11e7-b480-d89d672bfba0', last_name: 'Таянчина', first_name: 'Полина', tel: '89080177052', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'aafc068d-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: 'bb8f073e-7650-11ea-b754-d89d672bfba1', last_name: 'Молодченко', first_name: 'Юлия', tel: '89233128521', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'ba683f30-1349-11eb-80c9-a0d3c1ef2117' },
      { ID: '1c702d8f-9f8a-11e8-bcfd-d89d672bfba0', last_name: 'Мартынова', first_name: 'Анастасия', tel: '89237707112', ID_post: '68e71c50-31c8-11ea-93c4-d89d672bfba0', ID_city: 'f8d15325-1343-11eb-80c9-a0d3c1ef2117' },
    ];

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
  // return Promise.all(
  for (let item of data) {
    await checkEmployees(item);
  }
  // );
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
