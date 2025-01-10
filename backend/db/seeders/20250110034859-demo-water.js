'use strict';
const { query } = require('express');
const { User } = require('../models');
const bcrypt = require("bcryptjs");
const user = require('../models/user');

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  // define your schema in options object
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const demoUser = await User.findOne({
      where: { username: 'Demo-lition' }
    });

    const user1 = await User.findOne({
      where: { username: 'FakeUser1' }
    });

    const user2 = await User.findOne({
      where: { username: 'FakeUser2' }
    });

    await queryInterface.bulkInsert('WaterIntakes', [
      {
        userId: demoUser.id,
        date: new Date('2024-01-08'),
        waterConsumedOz: 45,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: user1.id,
        date: new Date('2024-01-08'),
        waterConsumedOz: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: user2.id,
        date: new Date('2024-01-08'),
        waterConsumedOz: 60,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'WaterIntakes';
    return queryInterface.bulkDelete(options, null, {});
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};
