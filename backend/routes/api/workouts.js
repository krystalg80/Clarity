const express = require('express');
const { Workout } = require('../../db/models');
const router = express.Router();

// POST /workouts/new - Log a workout
router.post('/new', async (req, res) => {
  const { userId, date, title, durationMinutes } = req.body;

  try {
    const newWorkout = await Workout.create({
      userId,
      date,
      title,
      durationMinutes
    });

    return res.status(201).json(newWorkout);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while logging the workout.'
    });
  }
});



// GET /workouts/:id - Get workout details
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const workout = await Workout.findByPk(id);

    if (!workout) {
      return res.status(404).json({
        message: 'Workout not found'
      });
    }

    return res.json({ workout });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while fetching workout details.'
    });
  }
});

// GET /workouts/user/:userId - Get all workouts for a user
router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
  
    try {
      const workouts = await Workout.findAll({
        where: { userId }
      });
  
      if (!workouts.length) {
        return res.status(404).json({
          message: 'No workouts found for this user'
        });
      }
  
      return res.json({ workouts });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'An error occurred while fetching workouts.'
      });
    }
  });

// PUT /workouts/:id - Update a workout
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { date, title, durationMinutes } = req.body;

  try {
    const workout = await Workout.findByPk(id);

    if (!workout) {
      return res.status(404).json({
        message: 'Workout not found'
      });
    }

    workout.date = date;
    workout.title = title;
    workout.durationMinutes = durationMinutes;

    await workout.save();

    return res.json({ workout });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while updating the workout.'
    });
  }
});

// DELETE /workouts/:id - Delete a workout
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const workout = await Workout.findByPk(id);

    if (!workout) {
      return res.status(404).json({
        message: 'Workout not found'
      });
    }

    await workout.destroy();

    return res.json({
      message: 'Workout deleted successfully'
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while deleting the workout.'
    });
  }
});
module.exports = router;