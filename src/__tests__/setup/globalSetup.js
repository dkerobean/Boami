const { MongoMemoryServer } = require('mongodb-memory-server')

module.exports = async () => {
  // Create an in-memory MongoDB instance
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'test',
    },
  })

  // Store the instance in global scope for teardown
  global.__MONGOD__ = mongod

  // Set the MongoDB URI for tests
  process.env.MONGODB_URI = mongod.getUri()
}