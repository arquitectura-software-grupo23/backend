const { Worker, Job } = require("bullmq");
const { linearRegression } = require('simple-statistics');
const axios = require("axios");


function performLinearRegression(dataset) {
  const minutes = 60 * 1000;
  const regression = linearRegression(dataset);
  const projections = [];

  let currentTimestamp = Date.now();
  for (let i = 0; i < dataset.length; i++) {
    currentTimestamp += 5 * minutes;
    const projectedValue = regression.m * currentTimestamp + regression.b;

    projections.push({ 
      timestamp: currentTimestamp, 
      value: projectedValue,
    });
  }

  return projections;
}


/**
 * @param {Job} job
 */

async function processor(job) {
  const dataset = job.data;
  console.log("Job received", dataset)

  if (!Array.isArray(dataset) || dataset.length === 0) {
    console.log("cagastexd")
    throw Error("Invalid dataset provided");
  }

  // Transform the dataset to the expected format
  const transformedDataset = dataset.map(entry => [entry.timestamp, entry.value]);

  const projectedPrice = performLinearRegression(transformedDataset);


  console.log("Projected Price:", projectedPrice);

  await axios.put(`http://api:3000/updateRegressionEntry/${job.id}`, {
    projections: projectedPrice,
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
