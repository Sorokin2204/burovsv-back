const db = require('../models');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const jwt = require('jsonwebtoken');
const { CustomError, TypeError } = require('../models/customError.model');
const { default: axios } = require('axios');
const Post = db.posts;
class PostController {
  async getPosts(req, res) {
    const employeeList = await Post.findAll();
    res.json(employeeList);
  }

  async syncPosts(req, res) {
    const dataFrom1C = await axios
      .get('http://localhost:3004/post')
      .then((res) => res.data)
      .catch((err) => {
        throw new CustomError();
      });

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
