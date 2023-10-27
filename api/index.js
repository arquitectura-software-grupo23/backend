/* eslint-disable camelcase */
/* eslint-disable consistent-return */
/* eslint-disable no-console */
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const { WebpayPlus } = require('transbank-sdk'); // ES5
const Stock = require('./Stock');
const Validation = require('./Validation');
const Request = require('./Request');
const LatestStock = require('./LatestStock');
const UserInfo = require('./UserInfo');
const invocarFuncionLambda = require('./voucher');

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

mongoose
  .connect('mongodb://mongo:27017/stocks')
  .then((db) => console.log('Connected!', db.connection.host));

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('API STOCKS');
});

app.get('/stocks', async (req, res) => {
  console.log('GET /stocks');
  res.send(await LatestStock.find({}, '-_id -__v -createdAt'));
});

app.get('/stocks/:symbol', async (req, res) => {
  console.log('GET /stocks/:symbol', req.params, req.query);

  let { page, size, date } = req.query;
  page ??= 1;
  size ??= 50;
  date ??= new Date(0);

  const { symbol } = req.params;

  try {
    res.send(
      await Stock.find(
        { createdAt: { $gte: date }, symbol },
        '-_id -__v -createdAt',
      )
        .sort({ createdAt: -1 })
        .skip((page - 1) * size)
        .limit(size),
    );
  } catch (error) {
    console.log(error);
    res.send({ error: 'Invalid query params' });
  }
});

app.get('/candlestick/:symbol', async (req, res) => {
  console.log('GET /candlestick/:symbol', req.params, req.query);

  let { candleSpanMins, chartSpanDays } = req.query;
  const { symbol } = req.params;

  // Default
  candleSpanMins = parseInt(candleSpanMins, 10) || 60;// Minutes int
  chartSpanDays = parseInt(chartSpanDays, 10) || 7;// Days int
  // Param to date conversion
  const startDate = new Date(Date.now() - chartSpanDays * 24 * 60 * 60 * 1000);

  const groupInterval = candleSpanMins * 60 * 1000;

  try {
    const candleData = await Stock.aggregate([
      {
        $match: {
          symbol,
          updatedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $subtract: [
              { $toLong: '$updatedAt' },
              { $mod: [{ $toLong: '$updatedAt' }, groupInterval] },
            ],
          },
          high: { $max: '$price' },
          low: { $min: '$price' },
          open: { $first: '$price' },
          close: { $last: '$price' },
        },
      },
      {
        $project: {
          candleTimeStamp: '$_id',
          high: 1,
          low: 1,
          open: 1,
          close: 1,
        },
      },
      { $sort: { candleTimeStamp: 1 } },
    ]);

    res.send({ data: candleData });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error fetching candlestick data' });
  }
});

app.get('/requests', async (req, res) => {
  console.log('GET /requests');
  res.send(await Request.find());
});

app.get('/requestsWithValidations', async (req, res) => {
  console.log('GET /validRequests');

  const { user_id } = req.query;
  const requests = await Request.aggregate()
    .match({ user_id })
    .lookup(
      {
        from: 'validations',
        localField: 'request_id',
        foreignField: 'request_id',
        as: 'validations',
      },
    )
    .exec();

  res.send(requests);
});

const createTransbankTransaction = async (price) => {
  const transaction = await (new WebpayPlus.Transaction()).create(
    'ID',
    'ID',
    Math.ceil(price * 1000),
    'http://localhost:5173/validate',
  );

  return transaction;
};

app.post('/request', async (req, res) => {
  console.log('POST /requests');

  try {
    const {
      symbol, quantity, user_id, user_ip, user_location,
    } = req.body;

    const request = await Request.create({
      group_id: '23',
      symbol,
      quantity,
      seller: '0',
      user_id,
      user_ip,
      user_location,
    });

    const {
      request_id,
      group_id,
      createdAt,
      seller,
    } = request;

    const stock = await LatestStock.findOne({ symbol });
    console.log(user_id, stock.price);
    // await UserInfo.updateOne({ userID: user_id }, { $inc: { wallet: stock.price * -1 } });

    const transaction = await createTransbankTransaction(quantity * stock.price);
    console.log(await Request.findOne({ request_id }));
    await Request.updateOne({ request_id }, { deposit_token: transaction.token });

    const newBody = JSON.stringify({
      request_id,
      group_id,
      symbol,
      datetime: createdAt,
      deposit_token: transaction.token,
      quantity,
      seller,
    });

    await fetch('http://mqtt:3001/request', {
      method: 'post',
      body: newBody,
      headers: { 'Content-Type': 'application/json' },
    });
    res.send(transaction);
  } catch (error) {
    return res.send({ error: 'Failed to fetch mqtt/request' });
  }
});

app.get('/validations', async (req, res) => {
  console.log('GET /validations');
  res.send(await Validation.find());
});

app.post('/validation', async (req, res) => {
  console.log('POST /validation');
  console.log(req.body);
  const validation = await Validation.create(req.body);
  if (!validation.valid) res.end();
  const { request_id } = validation;
  console.log("Request ID", request_id);
  const request = await Request.findOne({ request_id });
  console.log("Request encontrado", request);
  const user = await UserInfo.findOne({ userID: request.user_id });
  console.log("Usuario encontrado", user);
  const stock = await LatestStock.findOne({ symbol: request.symbol });
  console.log('SE EJECUTA LAMBDA');
  invocarFuncionLambda(
    user.userName,
    user.mail,
    request.deposit_token,
    request.symbol,
    request.quantity,
    Math.ceil(stock.price * 1000),
  );
  res.end();
});

app.post('/validate', async (req, res) => {
  console.log(req.body);
  let valid;

  if (req.body.TBK_TOKEN) {
    valid = false;
  } else {
    try {
      await new WebpayPlus.Transaction().commit(req.body.token_ws);
      const status = await new WebpayPlus.Transaction().status(req.body.token_ws);

      valid = status.response_code === 0;

      console.log(status);
    } catch (error) {
      console.log(error);
      valid = false;
    }
  }

  // hacer endpoint 3001: recibir el status del pago y mandar el validate en mqtt
  // hacer endpoint 3001: recibir validaciones con listening y mandarlas al 3000 (validation)

  // revisar lo del correo
  // implementar lo del pdf tanto en back como en front

  const request = await Request.findOne({ deposit_token: req.body.TBK_TOKEN || req.body.token_ws });
  console.log(request);

  await fetch('http://mqtt:3001/validation', {
    method: 'post',
    body: JSON.stringify({
      request_id: request.request_id,
      group_id: 23,
      seller: 0,
      valid,
    }),
    headers: { 'Content-Type': 'application/json' },
  });

  res.end();
});

app.post('/stock', (req, res) => {
  console.log('POST /stock');
  req.body.forEach(async (stock) => {
    await Stock.create(stock);
    await LatestStock.findOneAndUpdate({ symbol: stock.symbol }, stock, {
      upsert: true,
    });
  });
  res.end();
});

app.post('/logUser', async (req, res) => {
  console.log('POST /logUser');

  const { id, mail, userName } = req.body;

  if (!id) {
    return res.send({ error: 'ID is required' });
  }

  try {
    let user = await UserInfo.findOne({ userID: id });
    if (!user) {
      user = new UserInfo({
        userID: id,
        mail,
        userName,
      });
      console.log('usuario creado con éxito', user);
      await user.save();
    }
    res.end();
  } catch (error) {
    return res.send({ error: 'Internal server error' });
  }
});

app.post('/addMoney', async (req, res) => {
  console.log('POST /addMoney');
  const { id, amount } = req.body;
  const amountInt = parseInt(amount, 10);
  try {
    await UserInfo.updateOne({ userID: id }, { $inc: { wallet: amountInt } });
  } catch (error) {
    res.send({ error });
  }
  res.end();
});

app.get('/getMoney/:id', async (req, res) => {
  console.log('Get /getMoney');
  const userId = req.params.id; // Obtener el ID del usuario de los parámetros de la ruta
  res.send(await UserInfo.find(UserInfo.where('userID').equals(userId)));
});

app.get('/users', async (req, res) => {
  console.log('GET /users');
  res.send(await UserInfo.find({}, '-_id -__v'));
});

app.listen(port, () => {
  console.log(`API INICIADA EN PUERTO ${port}`);
});
