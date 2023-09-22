const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const Stock = require('./Stock');
const Validation = require('./Validation');
const Request = require('./Request');
const LatestStock = require('./LatestStock');
const UserInfo = require('./UserInfo');

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

app.post('/request', async (req, res) => {
  console.log('POST /requests');
  try {
    const {
      request_id,
      group_id,
      symbol,
      createdAt,
      deposit_token,
      quantity,
      seller,
    } = await Request.create(req.body);

    const newBody = JSON.stringify({
      request_id,
      group_id,
      symbol,
      datetime: createdAt,
      deposit_token,
      quantity,
      seller,
    });
    console.log(newBody);
    const response = await fetch('http://mqtt:3001/request', {
      method: 'post',
      body: newBody,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return res.send({ error: 'Failed to fetch mqtt/request' });
  }

  res.send(req.body);
});

app.get('/validations', async (req, res) => {
  console.log('GET /validations');
  res.send(await Validation.find());
});

app.post('/validation', async (req, res) => {
  console.log('POST /validation');
  console.log(req.body);
  await Validation.create(req.body);
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

  const { id } = req.body;

  if (!id) {
    return res.send({ error: 'ID is required' });
  }
  try {
    let user = await UserInfo.findOne({ userID: id });
    if (!user) {
      user = new UserInfo({
        userID: id,
        wallet: 0,
      });
      console.log('usuario creado con éxito', user);
      await user.save();
    }
    res.end();
  } catch (error) {
    res.send({ error: 'Internal server error' });
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
