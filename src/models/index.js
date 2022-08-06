const Sequelize = require('sequelize');
const reset = require('../setup');
const setupRelationship = require('../setupRelationship');
require('dotenv').config();
// const config = {
//   host: 'us-cdbr-east-06.cleardb.net',
//   user: 'bff23bd1bd5841',
//   pass: 'c094e2ab',
//   dbName: 'heroku_ab36879f58c5bab',
// };
const config = {
  host: 'localhost',
  user: 'root',
  pass: 'pass',
  dbName: 'burovsv_db',
};
const Op = Sequelize.Op;
const operatorsAliases = {
  $ne: Op.ne,
  $notIn: Op.notIn,
  $or: Op.or,
  $in: Op.in,
  $like: Op.like,
  $startWith: Op.startsWith,
};

const sequelize = new Sequelize(config.dbName, config.user, config.pass, {
  operatorsAliases,
  host: config.host,
  dialect: 'mysql',
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  logging: false,
});
sequelize.addHook('beforeDefine', (attributes) => {
  attributes.active = {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: true,
  };
});
const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

//MODELS

db.testings = require('./testing.model')(sequelize, Sequelize);
db.newsPosts = require('./newsPost.model')(sequelize, Sequelize);
db.news = require('./news.model')(sequelize, Sequelize);
db.newsFilters = require('./newsFilter.model')(sequelize, Sequelize);
db.newsTypes = require('./newsType.model')(sequelize, Sequelize);
db.posts = require('./post.model')(sequelize, Sequelize);
db.categories = require('./category.model')(sequelize, Sequelize);
db.categoryPostSubdivisions = require('./categoryPostSubdivision.model')(sequelize, Sequelize);
db.subdivisions = require('./subdivision.model')(sequelize, Sequelize);
db.postSubdivisions = require('./postSubdivision.model')(sequelize, Sequelize);
db.employees = require('./employee.model')(sequelize, Sequelize);

setupRelationship(db);

module.exports = db;
