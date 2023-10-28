const mongoose = require('mongoose');
const Request = require('./Request');

describe('Request Model Test', () => {
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

  it('creates and saves a Request instance', async () => {
    const request_id = 'testRequest';
    const group_id = 'testGroup';
    const symbol = 'AAPL';
    const deposit_token = 'testToken';
    const quantity = 10;
    const seller = 100;
    const user_id = 'testUser';
    const user_location = 'Test City';
    const user_ip = '127.0.0.1';

    const request = new Request({
      request_id,
      group_id,
      symbol,
      deposit_token,
      quantity,
      seller,
      user_id,
      user_location,
      user_ip,
    });

    const savedRequest = await request.save();

    // Check if the saved instance matches the data we provided
    expect(savedRequest.request_id).toBe(request_id);
    expect(savedRequest.group_id).toBe(group_id);
    expect(savedRequest.symbol).toBe(symbol);
    expect(savedRequest.deposit_token).toBe(deposit_token);
    expect(savedRequest.quantity).toBe(quantity);
    expect(savedRequest.seller).toBe(seller);
    expect(savedRequest.user_id).toBe(user_id);
    expect(savedRequest.user_location).toBe(user_location);
    expect(savedRequest.user_ip).toBe(user_ip);
  });

  it('should not save a Request instance with missing required fields', async () => {
    const request = new Request({
      // Missing required field(s) here
    });

    // Use a try-catch block to handle the validation error
    try {
      await request.save();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
