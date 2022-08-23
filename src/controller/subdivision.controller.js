const db = require('../models');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const jwt = require('jsonwebtoken');
const { CustomError, TypeError } = require('../models/customError.model');
const { default: axios } = require('axios');
const Subdivision = db.subdivisions;
const Post = db.posts;
class SubdivisionController {
  async getSubdivisions(req, res) {
    const subdivision = await Subdivision.findAll();
    res.json(subdivision);
  }

  async getSubdivision(req, res) {
    const { id } = req.params;
    const subdivision = await Subdivision.findOne({
      where: {
        id,
      },
      include: [
        {
          model: Post,
        },
      ],
    });
    res.json(subdivision);
  }

  async syncSubdivisions(req, res) {
    const dataFrom1C = await axios.get('http://winner-sql/zup_pay/hs/Exch_LP/ListSubdivisions');

    const formatData = formatSubdivisions(dataFrom1C);

    await upsertSubdivisions(formatData);
    await disableSubdivisions(formatData);

    res.json(formatData);
  }
}
function formatSubdivisions(data) {
  return data.map((item) => ({ idService: item?.ID, name: item?.name }));
}
function upsertSubdivisions(data) {
  return Promise.all(
    data.map((item) => {
      return checkSubdivisions(item);
    }),
  );
}
async function disableSubdivisions(data) {
  const ids = data.map(({ idService }) => idService);
  await Subdivision.update(
    { active: false },
    {
      where: {
        idService: {
          $notIn: ids,
        },
      },
    },
  );
  return Subdivision.update(
    { active: true },
    {
      where: {
        id: 1,
      },
    },
  );
}
async function checkSubdivisions({ idService, name }) {
  const findItem = await Subdivision.findOne({
    where: { idService },
  });
  if (findItem) {
    return Subdivision.update(
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
  return Subdivision.create(createData);
}
module.exports = new SubdivisionController();
