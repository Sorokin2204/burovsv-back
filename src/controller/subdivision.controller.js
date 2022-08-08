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
    const dataFrom1C = [
      { ID: 'e0c6fddc-1349-11eb-80c9-a0d3c1ef2117', name: 'Абакан ЛО_CENALOMMMMMM ' },
      { ID: 'f8d15325-1343-11eb-80c9-a0d3c1ef2117', name: 'Ачинск ЛО' },
      { ID: 'ade98481-06e6-11eb-80c9-a0d3c1ef2117', name: 'Боготол ЛО' },
      { ID: 'd80d79fc-1349-11eb-80c9-a0d3c1ef2117', name: 'Бородино ЛО_CENALOM' },
      { ID: 'c9882c7d-1349-11eb-80c9-a0d3c1ef2117', name: 'Железногорск ЛО_CENALOM' },
      { ID: 'ba683f30-1349-11eb-80c9-a0d3c1ef2117', name: 'Заозерный ЛО_CENALOM' },
      { ID: 'aafc068d-1349-11eb-80c9-a0d3c1ef2117', name: 'Зеленогорск ЛО_CENALOM' },
      { ID: '84b4219d-fbc1-11ea-80c9-a0d3c1ef2117', name: 'Канск ЛО' },
      { ID: '1cde76c6-fcb2-11ea-80c9-a0d3c1ef2117', name: 'Красноярск (Пашенный) ЛО' },
      { ID: '57a6b3bf-499a-11eb-80c9-a0d3c1ef2117', name: 'Красноярск (Спандаряна) ' },
      { ID: 'a022709e-1349-11eb-80c9-a0d3c1ef2117', name: 'Кызыл ЛО' },
      { ID: '95015495-1349-11eb-80c9-a0d3c1ef2117', name: 'Лесосибирск ЛО_CENALOM' },
      { ID: '877454bc-1349-11eb-80c9-a0d3c1ef2117', name: 'Минусинск ЛО_CENALOM' },
      { ID: '6d292a89-1349-11eb-80c9-a0d3c1ef2117', name: 'Назарово ЛО_CENALOM' },
      { ID: '07053afb-1343-11eb-80c9-a0d3c1ef2117', name: 'Сосновоборск ЛО' },
      { ID: 'fa561159-1348-11eb-80c9-a0d3c1ef2117', name: 'Черногорск ЛО_CENALOM' },
      { ID: '0e248704-86e9-11eb-80cb-a0d3c1ef2117', name: 'Шарыпово ЛО' },
      { ID: 'eceb2598-2279-11ec-80cb-a0d3c1ef2117', name: 'Красноярск (Атмосфера Дома) ЛО' },
      { ID: 'e5b7f72b-4f36-11ec-80cb-a0d3c1ef2117', name: 'Красноярск (Дудинская) ЛО ' },
    ];

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
  return Subdivision.update(
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
