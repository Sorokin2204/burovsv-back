const express = require('express');
const cors = require('cors');
const app = express();
const db = require('./src/models');
const bodyParser = require('body-parser');
const employeeRouter = require('./src/routes/employee.routes');
const testingRouter = require('./src/routes/testing.routes');
const newsFilterRouter = require('./src/routes/newsFilter.routes');
const newsRouter = require('./src/routes/news.routes');
const categoryRouter = require('./src/routes/category.routes');
const postRouter = require('./src/routes/post.routes');
const subdivisionRouter = require('./src/routes/subdivision.routes');

const cheerio = require('cheerio');
const reset = require('./src/setup');
const { handleError } = require('./src/middleware/customError');
const { CustomError, TypeError } = require('./src/models/customError.model');
require('dotenv').config();

var corsOptions = {
  origin: '*',
};
app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('./public/images'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

db.sequelize.sync().then((se) => {
  // reset(db);
});

app.use('/api', employeeRouter);
app.use('/api', newsFilterRouter);
app.use('/api', newsRouter);
app.use('/api', testingRouter);
app.use('/api', subdivisionRouter);
app.use('/api', postRouter);
app.use('/api', categoryRouter);
app.use(function (req, res, next) {
  throw new CustomError(404, TypeError.PATH_NOT_FOUND);
});
app.use(handleError);

// const PORT = process.env.PORT || 8080;
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

const axios = require('axios');
