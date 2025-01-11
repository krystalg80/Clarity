//Meditation routes
const express = require('express');
const { Meditation } = require('../../db/models');
const router = express.Router();

// POST /meditations/new - Log a meditation
router.post('/new', async (req, res) => {
  const { userId, date, durationMinutes } = req.body;

  try {
    const newMeditation = await Meditation.create({
      userId,
      date,
      durationMinutes
    });

    return res.status(201).json(newMeditation);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while logging the meditation.'
    });
  }
});
// GET meditation session details by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const meditation = await Meditation.findByPk(id);

    if (!meditation) {
      return res.status(404).json({
        message: 'Meditation session not found'
      });
    }

    return res.json({ meditation });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while fetching meditation session details.'
    });
  }
});
// GET all meditations for a user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const meditations = await Meditation.findAll({
      where: { userId }
    });

    if (!meditations.length) {
      return res.status(404).json({
        message: 'No meditations found for this user'
      });
    }

    return res.json({ meditations });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'An error occurred while fetching meditations.'
    });
  }
});
// UPDATE a meditation
router.put('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { date, durationMinutes } = req.body;
  
    try {
      const meditation = await Meditation.findByPk(id);
  
      if (!meditation) {
        return res.status(404).json({
          message: 'Meditation session not found'
        });
      }
  
      meditation.date = date;
      meditation.durationMinutes = durationMinutes;
  
      await meditation.save();
  
      return res.json({ meditation });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'An error occurred while updating the meditation session.'
      });
    }
  });
// DELETE a meditation
router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const meditation = await Meditation.findByPk(id);
    
        if (!meditation) {
        return res.status(404).json({
            message: 'Meditation session not found'
        });
        }
    
        await meditation.destroy();
    
        return res.json({ message: 'Meditation session deleted' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
        message: 'An error occurred while deleting the meditation session.'
        });
    }
    });

// GET /meditations/user/:userId/date/:date/summary - Get total meditation duration for a user on a specific date
router.get('/user/:userId/date/:date/summary', async (req, res) => {
    const { userId, date } = req.params;
  
    try {
      const totalMeditationMinutes = await Meditation.sum('durationMinutes', {
        where: { userId, date }
      });
  
      return res.json({ totalMeditationMinutes });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'An error occurred while fetching total meditation duration.'
      });
    }
  });

module.exports = router;