'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Water extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Water.belongsTo(models.User, { foreignKey: 'userId' });
      // define association here
    }
  }
  Water.init({
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
    waterConsumedOz: { 
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: "Please provide a water intake" },
        notEmpty: { msg: "Water intake cannot be empty" },
        isInt: { msg: "Water intake must be an integer" },
        min: { args: [1], msg: "Water intake must be greater than 0" }
      },

    }
  }, {
    sequelize,
    modelName: 'Water',
  });
  return Water;
};