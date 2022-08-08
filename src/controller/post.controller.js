const db = require('../models');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const jwt = require('jsonwebtoken');
const { CustomError, TypeError } = require('../models/customError.model');
const { default: axios } = require('axios');
const Post = db.posts;
class PostController {
  async testEmployee(req, res) {
    res.json();
  }
  async testPost(req, res) {
    res.json();
  }

  async testSubdivision(req, res) {
    res.json();
  }

  async getPosts(req, res) {
    const employeeList = await Post.findAll();
    res.json(employeeList);
  }

  async syncPosts(req, res) {
    const dataFrom1C = [
      { ID: 'c0f324b6-d0b5-11ea-80c6-a0d3c1ef2117', name: 'Менеджер торгового зала' },
      { ID: '68e71c50-31c8-11ea-93c4-d89d672bfba0', name: 'Продавец "Посуда"' },
      { ID: 'ab1c6a98-382d-11ea-93c4-d89d672bfba0', name: 'Управляющий' },
      { ID: '97204973-e769-11e4-84f5-001e676275b4', name: 'Директор' },
    ];

    const formatData = formatPosts(dataFrom1C);

    await upsertPosts(formatData);
    await disablePosts(formatData);

    res.json(formatData);
  }
}
function formatPosts(data) {
  return data.map((item) => ({ idService: item?.ID, name: item?.name }));
}
function upsertPosts(data) {
  return Promise.all(
    data.map((item) => {
      return checkPosts(item);
    }),
  );
}
async function disablePosts(data) {
  const ids = data.map(({ idService }) => idService);
  return Post.update(
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
async function checkPosts({ idService, name }) {
  const findItem = await Post.findOne({
    where: { idService },
  });
  if (findItem) {
    return Post.update(
      { name, active: true },
      {
        where: {
          idService,
        },
      },
    );
  }
  const createData = {
    idService,
    name,
  };
  return Post.create(createData);
}
module.exports = new PostController();
