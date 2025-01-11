const express = require('express');
const { Water } = require('../../db/models');
const router = express.Router();

// POST /waterintake/new - Log water intake
router.post('/new', async (req, res) => {
    const { userId, date, waterConsumedOz } = req.body;
  
    try {
      const newWaterIntake = await WaterIntake.create({
        userId,
        date,
        waterConsumedOz
      });
  
      return res.status(201).json(newWaterIntake);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'An error occurred while logging the water intake.'
      });
    }
  });

// GET water intake details by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const waterIntake = await WaterIntake.findByPk(id);
  
      if (!waterIntake) {
        return res.status(404).json({
          message: 'Water intake not found'
        });
      }
  
      return res.json({ waterIntake });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'An error occurred while fetching water intake details.'
      });
    }
  });

// GET all water intake for a user
router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
  
    try {
      const waterIntake = await WaterIntake.findAll({
        where: { userId }
      });
  
      if (!waterIntake.length) {
        return res.status(404).json({
          message: 'No water intake found for this user'
        });
      }
  
      return res.json({ waterIntake });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'An error occurred while fetching water intake details.'
      });
    }
  });

// Update water intake
router.put('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { date, waterConsumedOz } = req.body;
  
    try {
      const waterIntake = await WaterIntake.findByPk(id);
  
      if (!waterIntake) {
        return res.status(404).json({
          message: 'Water intake record not found'
        });
      }
  
      waterIntake.date = date;
      waterIntake.waterConsumedOz = waterConsumedOz;
  
      await waterIntake.save();
  
      return res.json({ waterIntake });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'An error occurred while updating the water intake record.'
      });
    }
  });

// Delete water intake
router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const waterIntake = await WaterIntake.findByPk(id);
  
      if (!waterIntake) {
        return res.status(404).json({
          message: 'Water intake record not found'
        });
      }
  
      await waterIntake.destroy();
  
      return res.json({
        message: 'Water intake record deleted'
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'An error occurred while deleting the water intake record.'
      });
    }
  });
  
// GET /waterintake/user/:userId/date/:date/summary - Get total water intake for a user on a specific date
router.get('/user/:userId/date/:date/summary', async (req, res) => {
    const { userId, date } = req.params;
  
    try {
      const totalWaterIntake = await WaterIntake.sum('waterConsumedOz', {
        where: {
          userId,
          date
        }
      });
  
      return res.json({ totalWaterIntake });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'An error occurred while fetching total water intake.'
      });
    }
  });
  
module.exports = router;