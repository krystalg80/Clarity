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
    // const demoUser = await User.findOne({
    //   where: { username: 'Demo-lition' }
    // });

    // const user1 = await User.findOne({
    //   where: { username: 'FakeUser1' }
    // });

    // const user2 = await User.findOne({
    //   where: { username: 'FakeUser2' }
    // });

    await MeditationSession.bulkCreate( [
      {
        userId: 1,
        date: new Date('2024-01-08'),
        durationMinutes: 10,
      },
      {
        userId: 2,
        date: new Date('2024-01-08'),
        durationMinutes: 10,
      },
      {
        userId: 3,
        date: new Date('2024-01-08'),
        durationMinutes: 10,
      }
    ], { schema: options.schema,
      validate: true });
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'MeditationSessions';
    return queryInterface.bulkDelete(options, null, { schema: options.schema });
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};
