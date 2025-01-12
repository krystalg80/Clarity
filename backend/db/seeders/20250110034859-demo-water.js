'use strict';
const { query } = require('express');
const { User } = require('../models');
const bcrypt = require("bcryptjs");

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

    await WaterIntake.bulkCreate( [
      {
        userId: 1,
        date: new Date('2024-01-08'),
        waterConsumedOz: 45,
        
      },
      {
        userId: 2,
        date: new Date('2024-01-08'),
        waterConsumedOz: 30,
        
      },
      {
        userId: 3,
        date: new Date('2024-01-08'),
        waterConsumedOz: 60,
       
      }
    ], { schema: options.schema,
      validate: true });
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
    return queryInterface.bulkDelete(options, null, { schema: options.schema });
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};
