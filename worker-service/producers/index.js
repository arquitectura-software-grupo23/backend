const express = require('express');
const { Queue } = require('bullmq');

const app = express();

const jobQueue = new Queue('regression-processing', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
  },
});

app.use(express.json());

app.post('/job', async (req, res) => {
  console.log('Received new job request');
  let jobId;
  try {
    console.log(req.body);
    const job = await jobQueue.add('regression', req.body);
    jobId = job.id;

    res.status(201).send({ jobId });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.listen(3002, () => {
  console.log('JobMaster server is running on port 3002');
});