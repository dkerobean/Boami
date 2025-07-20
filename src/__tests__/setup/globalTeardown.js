module.exports = async () => {
  // Stop the MongoDB Memory Server
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop()
  }
}