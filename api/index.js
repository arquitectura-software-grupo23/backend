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
const RegressionResult = require('./Regression');
const invocarFuncionLambda = require('./voucher');
const Auction = require('./Auction');
const promBundle = require('express-prom-bundle');
const metricsMiddleware = promBundle({includeMethod: true});

const GroupStock = require('./GroupStock');

async function addGroupStock(symbol, amount) {
  try {
    const groupStock = await GroupStock.findOne({ symbol });

    if (!groupStock) {
      await GroupStock.create({ symbol, amount });
    } else {
      const newAmount = groupStock.amount + amount;
      await GroupStock.updateOne({ symbol }, { amount: newAmount });
    }
  } catch (error) {
    console.log(error);
  }
}




const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { v4 } = require('./uuidc');

mongoose
  .connect('mongodb://mongo:27017/stocks')
  .then((db) => console.log('Connected!', db.connection.host));

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());
app.use(metricsMiddleware);

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
    'http://frontend.stocknet.me/validate',
  );

  return transaction;
};

app.post('/request', async (req, res) => {
  console.log('POST /requests');

  try {
    const {
      group_id, symbol, quantity, user_id, user_ip, user_location, seller,
    } = req.body;

    const request = await Request.create({
      group_id,
      symbol,
      quantity,
      seller,
      user_id,
      user_ip,
      user_location,
    });

    const {
      request_id,
      createdAt,
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

app.post('/groupStockPurchase', async (req, res) => {
  console.log('POST /groupStockPurchase');
  try {
    const {
      group_id, symbol, quantity, user_id, user_ip, user_location, seller,
    } = req.body;

    const groupStock = await GroupStock.findOne({ symbol });
    if (!groupStock || groupStock.amount < quantity) {
      return res.send({ error: 'Not enough stock available' });
    }

    const newAmount = groupStock.amount - quantity;
    await groupStock.updateOne({ symbol }, { amount: newAmount });

    const request = await Request.create({
      group_id,
      symbol,
      quantity,
      seller,
      user_id,
      user_ip,
      user_location,
    });

    const {
      request_id,
    } = request;

    const stock = await LatestStock.findOne({ symbol });
    console.log(user_id, stock.price);
    // await UserInfo.updateOne({ userID: user_id }, { $inc: { wallet: stock.price * -1 } });

    const transaction = await createTransbankTransaction(quantity * stock.price);
    console.log(await Request.findOne({ request_id }));
    await Request.updateOne({ request_id }, { deposit_token: transaction.token });

    res.send(transaction);
  } catch (error) {
    return res.send({ error: 'Failed to buy stock' });
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
  if (validation.group_id !== '23') return res.end();
  if (!validation.valid) return res.end();
  const { request_id } = validation;
  console.log('Request ID', request_id);
  const request = await Request.findOne({ request_id });
  console.log('Request encontrado', request);
  const user = await UserInfo.findOne({ userID: request.user_id });
  console.log('Usuario encontrado', user);
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
  if (validation.seller === '23') {
    addGroupStock(request.symbol, request.quantity * -1);
  }
  if (validation.seller !== '23') {
    addGroupStock(request.symbol, request.quantity);
  }
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

  const request = await Request.findOne({ deposit_token: req.body.TBK_TOKEN || req.body.token_ws });

  const stockSymbol = request.symbol;
  const stockQuantity = request.quantity;

  addGroupStock(stockSymbol, stockQuantity);

  console.log(request);

  await fetch('http://mqtt:3001/validation', {
    method: 'post',
    body: JSON.stringify({
      request_id: request.request_id,
      group_id: 23,
      seller: req.seller,
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
        isAdmin: false,
      });
      console.log('usuario creado con éxito', user);
      await user.save();
    }
    res.end();
  } catch (error) {
    return res.send({ error: 'Internal server error' });
  }
});

app.get('/adminCheck', async (req, res) => {
  console.log('GET /adminCheck');

  const { user_id } = req.query;
  const user = await UserInfo.findOne({ userID: user_id });
  res.send({ isAdmin: user.isAdmin });
});

app.get('/users', async (req, res) => {
  console.log('GET /users');
  res.send(await UserInfo.find({}, '-_id -__v'));
});

app.listen(port, () => {
  console.log(`API INICIADA EN PUERTO ${port}`);
});

function getPastDate(futureDate) {
  const pastDate = new Date(futureDate - 2 * (futureDate - Date.now()));
  return pastDate;
}

function mapDataForRegression(data) {
  return data.map((entry) => ({
    timestamp: new Date(entry.updatedAt).getTime(),
    value: entry.price,
  }));
}

app.post('/requestProjection/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { date, userId } = req.body;
  let data = [];

  const futureTimestamp = new Date(date).getTime();
  const pastDate = getPastDate(futureTimestamp);
  console.log('requesting regression for', symbol);
  console.log('target date:', date);

  try {
    data = await Stock.find(
      { createdAt: { $gte: pastDate }, symbol },
      '-_id -__v -createdAt',
    ).sort({ createdAt: -1 });
  } catch (error) {
    console.log(error);
    return res.send({ error: 'Invalid query params' });
  }
  const dataset = JSON.stringify(mapDataForRegression(data));
  const response = await fetch('http://producer:3002/job', {
    method: 'post',
    body: dataset,
    headers: { 'Content-Type': 'application/json' },
  });

  const { jobId } = await response.json();

  // Store the initial regression entry in the database

  const regressionEntry = new RegressionResult({
    jobId,
    userId,
    symbol,
    originalDataset: mapDataForRegression(data),
    projections: [],
    projection_len: 0, // Empty initially, will be updated by the consumer
  });

  try {
    console.log('Storing regression into database');
    await regressionEntry.save();
    res.send({ message: 'Regression requested successfully', jobId });
  } catch (error) {
    console.log(error);
    res.send({ error: 'Failed to store regression entry' });
  }
});

app.put('/updateRegressionEntry/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const { projections } = req.body;
  console.log('Received Projections:');

  try {
    await RegressionResult.findOneAndUpdate(
      { jobId },
      { $set: { projections, projection_len: projections.length } },
    );
    res.send({ message: 'Regression entry updated successfully' });
  } catch (error) {
    console.log(error);
    res.send({ error: 'Failed to update regression entry' });
  }
});

app.get('/getRegressionResult/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
    const regressionResult = await RegressionResult.findOne({ jobId });

    if (!regressionResult) {
      return res.status(404).send({ error: 'No regression result found for the given jobId' });
    }

    // Extract the target projection (furthest into the future)
    let targetProjection = null;
    if (regressionResult.projections && regressionResult.projections.length > 0) {
      targetProjection = regressionResult.projections.reduce((latest, current) => (current.timestamp > latest.timestamp ? current : latest));
    }

    // Construct the response object without originalDataset and projections
    const responseObject = {
      ...regressionResult._doc, // Spread the original document
      originalDataset: undefined, // Remove originalDataset
      projections: undefined, // Remove projections
      targetProjection, // Add target projection
    };

    console.log(responseObject.symbol);

    res.send(responseObject);
  } catch (error) {
    console.log(error);
    res.send({ error: 'Failed to retrieve regression result' });
  }
});

app.get('/regressioncandle/:jobId', async (req, res) => {
  console.log('GET /regressioncandle/:jobId', req.params);

  const { jobId } = req.params;

  try {
    const regressionData = await RegressionResult.findOne({ jobId });

    if (!regressionData || !regressionData.projections || regressionData.projections.length === 0) {
      return res.status(404).send({ error: 'No regression data found for the given jobId' });
    }

    const timestamps = regressionData.projections.map((p) => p.timestamp);
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);

    // Determine the interval for grouping based on 50 candles
    const groupInterval = (maxTimestamp - minTimestamp) / 50;

    // Group the projections into candles
    const groupedProjections = regressionData.projections.reduce((acc, curr) => {
      const groupId = Math.floor((curr.timestamp - minTimestamp) / groupInterval);
      if (!acc[groupId]) {
        acc[groupId] = {
          high: curr.value,
          low: curr.value,
          open: curr.value,
          close: curr.value,
          candleTimeStamp: groupId * groupInterval + minTimestamp,
        };
      } else {
        acc[groupId].high = Math.max(acc[groupId].high, curr.value);
        acc[groupId].low = Math.min(acc[groupId].low, curr.value);
        acc[groupId].close = curr.value;
      }
      return acc;
    }, {});

    const candleData = Object.values(groupedProjections).sort((a, b) => a.candleTimeStamp - b.candleTimeStamp);

    res.send({ data: candleData });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error fetching regression candlestick data' });
  }
});

app.get('/getAllRegressions/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const regressionResults = await RegressionResult.find({ userId }, 'jobId').sort({ createdAt: -1 });
    const jobIds = regressionResults.map((result) => result.jobId);
    res.send({ jobIds });
  } catch (error) {
    console.log(error);
    res.send({ error: 'Failed to retrieve regression requests for the user' });
  }
});

app.post('/auction', async (req, res) => {
  console.log('POST /auction');
  console.log(req.body);
  const auction = await Auction.create(req.body);

  if (auction.type === 'acceptance') {
    const offer = Auction.findOne({ auction_id: auction.auction_id });
    if (offer.groupId === 23) {
      addGroupStock(auction.stock_id, auction.quantity * -1);
    }

    if (auction.group_id === 23) {
      addGroupStock(auction.stock_id, auction.quantity);
    }
  }
  res.end();
});

app.get('/auctions', async (req, res) => { res.send(await Auction.find()); });

app.get('/auctions/:type', async (req, res) => {
  console.log('GET /auctions/:type');
  console.log(req.body);

  let { page, size } = req.query;
  page ??= 1;
  size ??= 50;

  const { type } = req.params;
  if (type === 'history') {
    try {
      res.send(await Auction.find(
        { $or: [{ type: { $eq: 'rejection' } }, { type: { $eq: 'acceptance' } }] },
        '-_id -__v -createdAt',
      )
        .sort({ createdAt: -1 })
        .skip((page - 1) * size)
        .limit(size));
    } catch (error) {
      console.log(error);
      res.send({ error: 'Invalid query params' });
    }
  } else {
    try {
      res.send(await Auction.find(
        { type: { $eq: type } },
        '-_id -__v -createdAt',
      )
        .sort({ createdAt: -1 })
        .skip((page - 1) * size)
        .limit(size));
    } catch (error) {
      console.log(error);
      res.send({ error: 'Invalid query params' });
    }
  }
});


app.post('/auctions/create', async (req, res) => {
  console.log('POST /auctions/create');
  console.log(req.body);
  const {
    auction_id, stock_id, quantity, type,
  } = req.body;

  let { proposal_id } = req.body;
  
  if (proposal_id === 'new') {
    proposal_id = v4()(); // (.)(.)
  }

  const proposal = {
    auction_id, proposal_id, stock_id, quantity, group_id: 23, type,
  };

  console.log(proposal);

  await fetch('http://mqtt:3001/auction', {
    method: 'post',
    body: JSON.stringify(proposal),
    headers: { 'Content-Type': 'application/json' },
  });

  res.end();
});

app.post('/addGroupStock', async (req, res) => {
  console.log('POST /addGroupStock');
  console.log(req.body);
  const { symbol, amount } = req.body;
  try {
    const groupStock = GroupStock.findOne();

    if (!groupStock) {
      await GroupStock.create(
        { symbol, amount },
      );
    } else {
      const newAmount = groupStock.amount + amount;
      await GroupStock.updateOne({ symbol }, { amount: newAmount });
    }
  } catch (error) {
    console.log(error);
    return res.send({ error: 'Invalid query params' });
  }
  res.end();
});

app.get('/groupstock', async (req, res) => { res.send(await GroupStock.find()); });
