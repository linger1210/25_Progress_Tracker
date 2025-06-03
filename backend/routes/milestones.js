const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Milestone = require('../models/Milestone');
const Project = require('../models/Project');
const { auth, authorizeDepartment } = require('../middleware/auth');

// Get milestones for a project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const milestones = await Milestone.find({ project: req.params.projectId })
      .populate('completedBy', 'username')
      .sort('order');
    
    res.json(milestones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create milestone (Production managers only)
router.post('/', [
  auth,
  authorizeDepartment('Production'),
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('name').trim().notEmpty().withMessage('Milestone name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, name } = req.body;

    // Check if project exists and is in Production stage
    const project = await Project.findById(projectId);
    if (!project || project.isDeleted) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.currentStage !== 'Production') {
      return res.status(400).json({ error: 'Project is not in Production stage' });
    }

    // Get the highest order number
    const lastMilestone = await Milestone.findOne({ project: projectId })
      .sort('-order');
    const order = lastMilestone ? lastMilestone.order + 1 : 1;

    const milestone = new Milestone({
      project: projectId,
      name,
      order
    });

    await milestone.save();
    res.status(201).json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update milestone
router.put('/:id', auth, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    const { name, status } = req.body;

    if (name) milestone.name = name;
    
    if (status) {
      milestone.status = status;
      if (status === 'completed') {
        milestone.completedAt = new Date();
        milestone.completedBy = req.user._id;

        // Check if all milestones are completed
        const allMilestones = await Milestone.find({ project: milestone.project });
        const allCompleted = allMilestones.every(m => 
          m._id.toString() === milestone._id.toString() ? status === 'completed' : m.status === 'completed'
        );

        if (allCompleted) {
          // Update project to completed
          const project = await Project.findById(milestone.project);
          project.stages.installation.status = 'completed';
          project.stages.installation.completedAt = new Date();
          project.stages.installation.completedBy = req.user._id;
          project.currentStage = 'Completed';
          await project.save();
        }
      }
    }

    await milestone.save();
    await milestone.populate('completedBy', 'username');
    
    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete milestone
router.delete('/:id', [
  auth,
  authorizeDepartment('Production')
], async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    await milestone.deleteOne();
    
    // Reorder remaining milestones
    const remainingMilestones = await Milestone.find({ project: milestone.project })
      .sort('order');
    
    for (let i = 0; i < remainingMilestones.length; i++) {
      remainingMilestones[i].order = i + 1;
      await remainingMilestones[i].save();
    }

    res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add photo to milestone
router.post('/:id/photos', auth, async (req, res) => {
  try {
    const { url } = req.body;
    const milestone = await Milestone.findById(req.params.id);
    
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    milestone.photos.push({
      url,
      uploadedBy: req.user._id
    });

    await milestone.save();
    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 