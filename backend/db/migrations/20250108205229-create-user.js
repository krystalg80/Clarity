'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      username: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(256),
        allowNull: false,
      },
      hashedPassword: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      exerciseGoalMinutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      waterGoalOz: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      meditationGoalMinutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Users');
  }
};