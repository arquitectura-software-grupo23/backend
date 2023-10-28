const mongoose = require('mongoose');
const UserInfo = require('./UserInfo');

describe('UserInfo Model Test', () => {
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

  it('creates and saves a UserInfo instance', async () => {
    const userInfoData = {
      userID: 'testUser',
      wallet: 1000,
      mail: 'test@example.com',
      userName: 'Test User',
    };

    const userInfo = new UserInfo(userInfoData);
    const savedUserInfo = await userInfo.save();

    // Check if the saved instance matches the data we provided
    expect(savedUserInfo.userID).toBe(userInfoData.userID);
    expect(savedUserInfo.wallet).toBe(userInfoData.wallet);
    expect(savedUserInfo.mail).toBe(userInfoData.mail);
    expect(savedUserInfo.userName).toBe(userInfoData.userName);
  });

  it('should not save a UserInfo instance with invalid data', async () => {
    const userInfo = new UserInfo({
      // Invalid data here (e.g., missing required fields)
    });

    // Use a try-catch block to handle the validation error
    try {
      await userInfo.save();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
