function reset(db) {
  db.newsTypes.bulkCreate([{ name: 'Новость' }, { name: 'Обучние' }]);
}

module.exports = reset;
