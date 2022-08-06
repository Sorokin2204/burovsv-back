const setupRelationship = (db) => {
  db.posts.belongsToMany(db.subdivisions, { through: { model: db.postSubdivisions, as: 'postSubdivision', unique: false }, foreignKey: 'postId' });
  db.subdivisions.belongsToMany(db.posts, { through: { model: db.postSubdivisions, as: 'postSubdivision', unique: false }, foreignKey: 'subdivisionId' });

  db.postSubdivisions.hasMany(db.employees);
  db.employees.belongsTo(db.postSubdivisions);

  db.categories.belongsToMany(db.postSubdivisions, { through: { model: db.categoryPostSubdivisions, unique: false }, foreignKey: 'categoryId' });
  db.postSubdivisions.belongsToMany(db.categories, { through: { model: db.categoryPostSubdivisions, unique: false }, foreignKey: 'postSubdivisionId' });

  db.categoryPostSubdivisions.hasMany(db.testings);
  db.testings.belongsTo(db.categoryPostSubdivisions);

  db.posts.belongsToMany(db.news, { through: { model: db.newsPosts, unique: false }, foreignKey: 'postId' });
  db.news.belongsToMany(db.posts, { through: { model: db.newsPosts, unique: false }, foreignKey: 'newsId' });

  db.newsTypes.hasMany(db.newsFilters);
  db.newsFilters.belongsTo(db.newsTypes);

  db.newsFilters.hasMany(db.news);
  db.news.belongsTo(db.newsFilters);
};

module.exports = setupRelationship;
