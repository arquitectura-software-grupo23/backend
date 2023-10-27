/* eslint-disable no-console */
const mqtt = require('mqtt');
const express = require('express');
const cors = require('cors');

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

require('dotenv').config();

const url = `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`;

const options = {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASSWORD,
};

const client = mqtt.connect(url, options);
client.on('connect', () => {
  console.log('Connected to MQTT');
  client.subscribe('stocks/info', () => {});
  client.subscribe('stocks/validation', () => {});
});

client.on('message', async (topic, message) => {
  console.log(topic);

  if (topic === 'stocks/info') {
    console.log('Message from: Info');
    const response = await fetch('http://api:3000/stock', {
      method: 'post',
      body: JSON.parse(message).stocks,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (topic === 'stocks/validation') {
    console.log('Message from: Validation');
    console.log(message.toString());
    const parsedJson = JSON.parse(message);
    try {
      const response = await fetch('http://api:3000/validation', {
        method: 'post',
        body: JSON.stringify(parsedJson),
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.log('Error in topic socks/validation: ', error);
    }
  }
});

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('API MQTT');
});

app.post('/request', async (req, res) => {
  console.log('POST request');
  console.log(req.body);
  client.publish('stocks/requests', JSON.stringify(req.body));
  res.end();
});

app.post('/validation', async (req, res) => {
  console.log('POST validation');
  console.log(req.body);
  client.publish('stocks/validation', JSON.stringify(req.body));
  res.end();
});

app.listen(port, () => {
  console.log(`API INICIADA EN PUERTO ${port}`);
});
