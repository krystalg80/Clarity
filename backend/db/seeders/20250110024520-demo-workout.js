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

    await queryInterface.bulkInsert('Workouts', [
      {
        userId: demoUser.id,
        title: 'Run',
        date: new Date('2024-01-08'),
        durationMinutes: 45,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: user1.id,
        title: 'Yoga',
        date: new Date('2024-01-08'),
        durationMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: user2.id,
        title: 'Lift',
        date: new Date('2024-01-08'),
        durationMinutes: 60,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'Workouts';
    return queryInterface.bulkDelete(options, null, {});
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};
