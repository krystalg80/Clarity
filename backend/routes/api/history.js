// const express = require('express');
// const { Op } = require('sequelize');
// const { Workout, Meditation } = require('../../db/models');
// const router = express.Router();

// // GET /history/user/:userId - Get workout and meditation history for a user from the last 7 days
// router.get('/user/:userId', async (req, res) => {
//   const { userId } = req.params;
//   const currentDate = new Date(); // Current date
//   const lastWeekDate = new Date();
//   lastWeekDate.setDate(currentDate.getDate() - 7); // Subtract 7 days

//   // Set the time to the start of the day for lastWeekDate and end of the day for currentDate
//   lastWeekDate.setHours(0, 0, 0, 0);
//   currentDate.setHours(23, 59, 59, 999);

//   // Log the date range
//   console.log('Current Date:', currentDate);
//   console.log('Last Week Date:', lastWeekDate);

//   try {
//     const workoutHistory = await Workout.findAll({
//       where: {
//         userId,
//         date: {
//           [Op.between]: [lastWeekDate, currentDate] // Between last week and today
//         }
//       },
//       order: [['date', 'ASC']]
//     });
//     console.log('Workout History:', workoutHistory);

//     const meditationHistory = await Meditation.findAll({
//       where: {
//         userId,
//         date: {
//           [Op.between]: [lastWeekDate, currentDate] // Between last week and today
//         }
//       },
//       order: [['date', 'ASC']]
//     });
//     console.log('Meditation History:', meditationHistory);

//     return res.json({ workoutHistory, meditationHistory });
//   } catch (error) {
//     console.error('Error fetching history:', error);
//     return res.status(500).json({
//       message: 'An error occurred while fetching history.'
//     });
//   }
// });

// module.exports = router;