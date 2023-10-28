const { Worker, Job } = require("bullmq");
const { linearRegression } = require('simple-statistics');
const axios = require("axios");


function performLinearRegression(dataset, targetDate) {
  const minutes = 60 * 1000;
  const regression = linearRegression(dataset);
  const projections = [];

  let currentTimestamp = Date.now();
  console.log("now:", currentTimestamp)
  console.log("target:", targetDate)
  
  while (currentTimestamp <= targetDate) {
    currentTimestamp += 5 * minutes;
    console.log(new Date(currentTimestamp));
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
  const earliestTimestamp = dataset[0].timestamp;
  console.log("data len", dataset.length)
  console.log("[0] timestamp", new Date(dataset[0].timestamp))
  console.log("[n-1] timestamp", new Date(dataset[dataset.length-1].timestamp))

  
  const duration = dataset[0].timestamp - dataset[dataset.length-1].timestamp;
const targetDate = Date.now() + duration;


  console.log("Job received", dataset)
  console.log("Calculated targetDate:", new Date(targetDate));

  if (!Array.isArray(dataset) || dataset.length === 0) {
    throw Error("Invalid dataset provided");
  }

  // Transform the dataset to the expected format
  const transformedDataset = dataset.map(entry => [entry.timestamp, entry.value]);

  const projectedPrice = performLinearRegression(transformedDataset, targetDate);



  console.log("Projected Price:", projectedPrice);
  let targetProjection = null;
    if (projectedPrice.length > 0) {
      targetProjection = regressionResult.projections.reduce((latest, current) => {
        console.log( current.timestamp > latest.timestamp ? current : latest);
      });
    }

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
