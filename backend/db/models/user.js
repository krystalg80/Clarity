'use strict';
const {
  Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  User.init({
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notNull: { msg: "Please provide a username" },
        notEmpty: { msg: "Username cannot be empty" },
        //username cant be email
        isNotEmail(value) {
          if (value.match(/@/)) {
            throw new Error("Username cannot be an email");
          }
        }
      },
    },
    email: { 
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notNull: { msg: "Please provide an email" },
        notEmpty: { msg: "Email cannot be empty" },
        isEmail: { msg: "Please provide a valid email" },
      },
     },
     firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    hashedPassword: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: "Please provide a password" },
        notEmpty: { msg: "Password cannot be empty" },
      },
    },
    exerciseGoalMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: "Exercise goal must be an integer" },
        min: { args: [0], msg: "Exercise goal must be greater than or equal to 0" },
      },
    },
    waterGoalOz: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: "Water goal must be an integer" },
        min: { args: [0], msg: "Water goal must be greater than or equal to 0" },
      },
    },
    meditationGoalMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: { msg: "Meditation goal must be an integer" },
        min: { args: [0], msg: "Meditation goal must be greater than or equal to 0" },
      },
   },
 }, {
    sequelize,
    modelName: 'User',
    defaultScope: {
      attributes: { exclude: ['hashedPassword', 'email', 'createdAt','updatedAt'] },
    },
  });
  return User;
};