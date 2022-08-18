function reset(db) {
  db.newsTypes.bulkCreate([
    { id: 1, name: 'Новость' },
    { id: 2, name: 'Обучние' },
  ]);
}

module.exports = reset;
