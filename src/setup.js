function reset(db) {
  db.subdivisions.bulkCreate([{ id: 1, idService: '1111', name: 'Администрация', active: 1 }]);
  db.posts.bulkCreate([{ id: 1, idService: '1111', name: 'Администрация', active: 1 }]);

  db.postSubdivisions.bulkCreate([{ id: 1, active: 1, postId: 1, subdivisionId: 1 }]);
  db.employees.bulkCreate([{ id: 1, idService: '1111', firstName: 'Админ', lastName: 'Админ', tel: '1111111111', active: 1, role: 'admin', postSubdivisionId: 1, password: '$2a$04$LCagjUmL0NQCguVQiOjVG.JNciI71n7yS9jYb/N/xjmXdSlnWpyXa' }]);
  db.newsTypes.bulkCreate([
    { id: 1, name: 'Новость' },
    { id: 2, name: 'Обучние' },
  ]);
}

module.exports = reset;
