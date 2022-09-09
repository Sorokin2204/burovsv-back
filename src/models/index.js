const Sequelize = require('sequelize');
const reset = require('../setup');
const setupRelationship = require('../setupRelationship');
require('dotenv').config();
// const config = {
//   host: 'us-cdbr-east-06.cleardb.net',
//   user: 'bda484f42dd392',
//   pass: 'd5e100f3',
//   dbName: 'heroku_067da1f490a0278',
// };
const config = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  pass: process.env.MYSQL_PASSWORD,
  dbName: process.env.MYSQL_DB,
};

const Op = Sequelize.Op;
const operatorsAliases = {
  $ne: Op.ne,
  $notIn: Op.notIn,
  $or: Op.or,
  $in: Op.in,
  $like: Op.like,
  $startWith: Op.startsWith,
  $lte: Op.lte,
  $lt: Op.lt,
  $gte: Op.gte,
  $gt: Op.gt,
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
db.testingFilters = require('./testingFilter.model')(sequelize, Sequelize);
db.newsTypes = require('./newsType.model')(sequelize, Sequelize);
db.posts = require('./post.model')(sequelize, Sequelize);
db.categories = require('./category.model')(sequelize, Sequelize);
db.categoryTestings = require('./categoryTesting.model')(sequelize, Sequelize);
db.categoryPostSubdivisions = require('./categoryPostSubdivision.model')(sequelize, Sequelize);
db.subdivisions = require('./subdivision.model')(sequelize, Sequelize);
db.postSubdivisions = require('./postSubdivision.model')(sequelize, Sequelize);
db.employees = require('./employee.model')(sequelize, Sequelize);

setupRelationship(db);

module.exports = db;
