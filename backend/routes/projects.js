const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const { auth, authorize, authorizeDepartment } = require('../middleware/auth');

// Get all projects (filtered by department and role)
router.get('/', auth, async (req, res) => {
  try {
    const { stage, status } = req.query;
    let query = { isDeleted: false };

    // Filter by stage if provided
    if (stage) {
      query.currentStage = stage;
    }

    // Filter by status if provided
    if (status) {
      query[`stages.${stage.toLowerCase()}.status`] = status;
    }

    const projects = await Project.find(query)
      .populate('createdBy', 'username department')
      .sort('-createdAt');

    // Filter amount field based on role
    const projectsData = projects.map(project => {
      const projectObj = project.toObject();
      if (req.user.role !== 'admin') {
        delete projectObj.amount;
      }
      return projectObj;
    });

    res.json(projectsData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new project (Sales only)
router.post('/', [
  auth,
  authorizeDepartment('Sales'),
  body('projectName').trim().notEmpty().withMessage('Project name is required'),
  body('estimatedCompletionDate').isISO8601().withMessage('Valid date is required'),
  body('amount').isNumeric().withMessage('Amount must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectName, estimatedCompletionDate, amount } = req.body;

    const project = new Project({
      projectName,
      estimatedCompletionDate,
      amount,
      createdBy: req.user._id,
      currentStage: 'DNE',
      'stages.sales.status': 'submitted',
      'stages.sales.submittedAt': new Date(),
      'stages.sales.submittedBy': req.user._id
    });

    await project.save();
    await project.populate('createdBy', 'username department');

    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project || project.isDeleted) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permissions based on department and current stage
    const canEdit = 
      req.user.role === 'admin' ||
      (req.user.department === 'Sales' && project.currentStage === 'Sales') ||
      (req.user.department === project.currentStage);

    if (!canEdit) {
      return res.status(403).json({ error: 'Not authorized to edit this project' });
    }

    const updates = req.body;
    
    // Prevent non-admin users from updating amount
    if (req.user.role !== 'admin') {
      delete updates.amount;
    }

    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'createdBy') {
        project[key] = updates[key];
      }
    });

    await project.save();
    await project.populate('createdBy', 'username department');

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update project stage (DNE)
router.post('/:id/dne-update', [
  auth,
  authorizeDepartment('DNE')
], async (req, res) => {
  try {
    const { status } = req.body;
    const project = await Project.findById(req.params.id);
    
    if (!project || project.isDeleted) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.currentStage !== 'DNE') {
      return res.status(400).json({ error: 'Project is not in DNE stage' });
    }

    project.stages.dne.status = status;
    project.stages.dne.completedBy = req.user._id;

    if (status === 'partial_completed') {
      project.stages.dne.partialCompletedAt = new Date();
      // Create default milestones when moving to production
      await createDefaultMilestones(project._id);
    } else if (status === 'completed') {
      project.stages.dne.completedAt = new Date();
      project.currentStage = 'Production';
      project.stages.production.status = 'in_progress';
      // Create default milestones if not already created
      const existingMilestones = await Milestone.find({ project: project._id });
      if (existingMilestones.length === 0) {
        await createDefaultMilestones(project._id);
      }
    }

    await project.save();
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update project stage (Production)
router.post('/:id/production-update', [
  auth,
  authorizeDepartment('Production')
], async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project || project.isDeleted) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.currentStage !== 'Production') {
      return res.status(400).json({ error: 'Project is not in Production stage' });
    }

    project.stages.production.status = 'completed';
    project.stages.production.completedAt = new Date();
    project.stages.production.completedBy = req.user._id;
    project.currentStage = 'Installation';
    project.stages.installation.status = 'in_progress';

    await project.save();
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete project (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project || project.isDeleted) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only admin or creator can delete
    if (req.user.role !== 'admin' && project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this project' });
    }

    project.isDeleted = true;
    await project.save();

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to create default milestones
async function createDefaultMilestones(projectId) {
  const defaultMilestones = [
    { name: 'Assembly/Welding', order: 1 },
    { name: 'Painting', order: 2 }
  ];

  for (const milestone of defaultMilestones) {
    await Milestone.create({
      project: projectId,
      name: milestone.name,
      order: milestone.order
    });
  }
}

module.exports = router; 