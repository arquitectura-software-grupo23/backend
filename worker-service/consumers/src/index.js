const { Worker, Job } = require("bullmq");
const { linearRegression } = require('simple-statistics');
const axios = require("axios");


function performLinearRegression(dataset) {
  const minutes = 60 * 1000;
  const regression = linearRegression(dataset);
  const projections = [];

  let currentTimestamp = dataset[dataset.length - 1].timestamp;
  for (let i = 0; i < dataset.length; i++) {
    currentTimestamp += 5 * minutes;
    const projectedValue = regression.m * currentTimestamp + regression.b;

    projections.push({ 
      createdAt: currentTimestamp, 
      price: projectedValue,
    });
  }

  const result = {
    originalDataset: dataset,
    projections: projections
  };

  return result;
}

/**
 * @param {Job} job
 */

async function processor(job) {
  const dataset = job.data;
  console.log("Job received", dataset)

  if (!Array.isArray(dataset) || dataset.length === 0) {
    throw Error("Invalid dataset provided");
  }

  const projectedPrice = performLinearRegression(dataset);

  await axios.post('http://api:3000/projection', {
    jobId: job.id,
    result: projectedPrice,
  });

  return `Linear regression completed: Projected price is ${projectedPrice}`;
}

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
};

const worker = new Worker("regression-processing", processor, {
  autorun: false,
  connection,
});

console.log("Worker Listening to Jobs...");

worker.on("completed", (job, returnValue) => {
  console.log(`Worker completed job ${job.id} with result: ${returnValue}`);
});

worker.on("failed", (job, error) => {
  console.log(`Worker completed job ${job.id} with error: ${error}`);
});


worker.on("error", (err) => {
  console.error(err);
});

worker.run();

// Graceful shutdown
async function shutdown() {
  console.log("Received SIGTERM signal. Gracefully shutting down...");
  await worker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
