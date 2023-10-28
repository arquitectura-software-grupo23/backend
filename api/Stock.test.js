const mongoose = require('mongoose');
const Stock = require('./Stock');

describe('Stock Model Test', () => {
  beforeAll(async () => {
    // Connect to a test database or use an in-memory database (e.g., using mongoose-memory-server)
    await mongoose.connect('mongodb://localhost:27017/testdb', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    // Disconnect from the test database
    await mongoose.connection.close();
  });

  it('creates and saves a Stock instance', async () => {
    const stockData = {
      symbol: 'AAPL',
      shortName: 'Apple Inc.',
      price: 150.0,
      currency: 'USD',
      source: 'NASDAQ',
    };

    const stock = new Stock(stockData);
    const savedStock = await stock.save();

    // Check if the saved instance matches the data we provided
    expect(savedStock.symbol).toBe(stockData.symbol);
    expect(savedStock.shortName).toBe(stockData.shortName);
    expect(savedStock.price).toBe(stockData.price);
    expect(savedStock.currency).toBe(stockData.currency);
    expect(savedStock.source).toBe(stockData.source);
  });

  it('should not save a Stock instance with invalid data', async () => {
    const stock = new Stock({
      // Invalid data here (e.g., missing required fields)
    });

    // Use a try-catch block to handle the validation error
    try {
      await stock.save();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
