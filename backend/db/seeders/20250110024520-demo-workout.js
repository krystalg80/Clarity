'use strict';

const { Workout } = require('../models');


let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  // define your schema in options object
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
  //   const demoUser = await User.findOne({
  //     where: { username: 'Demo-lition' }
  //   });

  //   const user1 = await User.findOne({
  //     where: { username: 'FakeUser1' }
  //   });

  //   const user2 = await User.findOne({
  //     where: { username: 'FakeUser2' }
  //   });

    await Workout.bulkCreate( [
      {
        userId: 1,
        title: 'Run',
        date: new Date('2024-01-08'),
        durationMinutes: 45,
      },
      {
        userId: 2,
        title: 'Yoga',
        date: new Date('2024-01-08'),
        durationMinutes: 30,
      },
      {
        userId: 3,
        title: 'Lift',
        date: new Date('2024-01-08'),
        durationMinutes: 60,
      }
    ], { schema: options.schema,
      validate: true });
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'Workouts';
    return queryInterface.bulkDelete(options, null, { schema: options.schema });
  }
};
