module.exports = (sequelize, Sequelize) => {
  const News = sequelize.define('news', {
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    desc: {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    },
    descShort: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    dateStart: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    dateEnd: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    image: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  });
  return News;
};
