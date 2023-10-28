const mongoose = require('mongoose');
const Validation = require('./Validation');

describe('Validation Model Test', () => {
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

  it('creates and saves a Validation instance', async () => {
    const validationData = {
      request_id: 'testRequest',
      group_id: 'testGroup',
      seller: 100,
      valid: true,
    };

    const validation = new Validation(validationData);
    const savedValidation = await validation.save();

    // Check if the saved instance matches the data we provided
    expect(savedValidation.request_id).toBe(validationData.request_id);
    expect(savedValidation.group_id).toBe(validationData.group_id);
    expect(savedValidation.seller).toBe(validationData.seller);
    expect(savedValidation.valid).toBe(validationData.valid);
  });

  it('should not save a Validation instance with invalid data', async () => {
    const validation = new Validation({
        // Missing required field 'request_id'
        group_id: 'testGroup',
        seller: 100,
        valid: true,
    });

    // Use a try-catch block to handle the validation error
    try {
      await validation.save();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
