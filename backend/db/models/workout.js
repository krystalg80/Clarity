'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Workout extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Workout.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }
  Workout.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: "Please provide a user ID" },
        notEmpty: { msg: "User ID cannot be empty" },
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: "Please provide a title" },
        notEmpty: { msg: "Title cannot be empty" },
      },
    },
    date: { 
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notNull: { msg: "Please provide a date" },
        notEmpty: { msg: "Date cannot be empty" },
        isDate: { msg: "Must be a valid date" }
      },
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: "Please provide a duration" },
        notEmpty: { msg: "Duration cannot be empty" },
        isInt: { msg: "Duration must be an integer" },
        min: { args: [1], msg: "Duration must be greater than 0" }
      },
    },
  }, {
    sequelize,
    modelName: 'Workout',
  });
  return Workout;
};