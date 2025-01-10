const express = require('express');
const bcrypt = require('bcryptjs');
const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');
const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { User } = require('../../db/models');

const router = express.Router();

//Validate signup
const validateSignup = [
    check('email')
      .exists({ checkFalsy: true })
      .isEmail()
      .withMessage('Please provide a valid email.'),
    check('username')
      .exists({ checkFalsy: true })
      .isLength({ min: 4 })
      .withMessage('Please provide a username with at least 4 characters.'),
    check('username')
      .not()
      .isEmail()
      .withMessage('Username cannot be an email.'),
    check('password')
      .exists({ checkFalsy: true })
      .isLength({ min: 6 })
      .withMessage('Password must be 6 characters or more.'),
    check('exerciseGoalMinutes')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Exercise goal must be an integer greater than or equal to 0.'),
    check('waterGoalOz')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Water goal must be an integer greater than or equal to 0.'),
    check('meditationGoalMinutes')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Meditation goal must be an integer greater than or equal to 0.'),
    handleValidationErrors
  ];


// Sign up
router.post(
    '/register',
    validateSignup,
    async (req, res) => {
      const { email, password, username, firstName, lastName, exerciseGoalMinutes, waterGoalOz, meditationGoalMinutes } = req.body;
      const hashedPassword = bcrypt.hashSync(password);
      const user = await User.create({ email, username, hashedPassword, firstName, lastName, exerciseGoalMinutes, waterGoalOz, meditationGoalMinutes });
  
      const safeUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        exerciseGoalMinutes: user.exerciseGoalMinutes,
        waterGoalOz: user.waterGoalOz,
        meditationGoalMinutes: user.meditationGoalMinutes,
      };
  
      await setTokenCookie(res, safeUser);
  
      return res.json({
        user: safeUser
      });
    }
);

// GET /users/:id - Get user details
router.get('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
  
    try {
      const user = await User.findByPk(id);  // Find user by ID
  
      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }
  
      const userDetails = {
        id: user.id,
        username: user.username,
        email: user.email,
        exerciseGoalMinutes: user.exerciseGoalMinutes,
        waterGoalOz: user.waterGoalOz,
        meditationGoalMinutes: user.meditationGoalMinutes,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
  
      return res.json({ user: userDetails });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        message: 'An error occurred while fetching user details.'
      });
    }
  });


module.exports = router;