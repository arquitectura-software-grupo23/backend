const mqtt = require('mqtt');
require('dotenv').config();

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const url = `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`;

// Create an MQTT client instance
const options = {
  // Authentication
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASSWORD,
};

const client = mqtt.connect(url, options);
client.on('connect', () => {
  console.log('Connected');

  // Aqui se suscribe al canal
  client.subscribe('stocks/info', (err) => {
    if (!err) {
      // Publish a message to a topic
      // client.publish('test', 'Hello mqtt');
    }
  });
});

// Receive messages
client.on('message', async (topic, message) => {
  // message is Buffer
  // console.log(topic, JSON.parse(message));
  const response = await fetch('http://api:3000/stock', {
    method: 'post',
    body: JSON.parse(message).stocks,
    headers: { 'Content-Type': 'application/json' },
  });
  // client.end();
});
