'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Meditation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Meditation.belongsTo(models.User, { foreignKey: 'userId' });
      // define association here
    }
  }
  Meditation.init({
    userId: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      validate: {
        notNull: { msg: "Please provide a user ID" },
        notEmpty: { msg: "User ID cannot be empty" },
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
    modelName: 'Meditation',
  });
  return Meditation;
};