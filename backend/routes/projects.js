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

    // Filter amount field based on role - Sales can see amounts in their own projects
    const projectsData = projects.map(project => {
      const projectObj = project.toObject();
      if (req.user.role !== 'admin' && req.user.department !== 'Sales' && req.user.department !== 'Management') {
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

    // Check permissions based on department and role
    const canEdit = 
      req.user.role === 'admin' ||
      req.user.department === 'Management' ||
      (req.user.department === 'Sales' && project.createdBy.toString() === req.user._id.toString()) ||
      (req.user.department === project.currentStage);

    if (!canEdit) {
      return res.status(403).json({ error: 'Not authorized to edit this project' });
    }

    const updates = req.body;
    
    // Sales users can edit projectName, estimatedCompletionDate, and amount of their own projects
    // Other departments cannot edit amount unless admin/management
    if (req.user.role !== 'admin' && req.user.department !== 'Management' && req.user.department !== 'Sales') {
      delete updates.amount;
    }

    // Restrict what Sales can edit to basic project info
    if (req.user.department === 'Sales' && req.user.role !== 'admin') {
      const allowedUpdates = ['projectName', 'estimatedCompletionDate', 'amount'];
      Object.keys(updates).forEach(key => {
        if (!allowedUpdates.includes(key)) {
          delete updates[key];
        }
      });
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

    const previousStatus = project.stages.dne.status;
    project.stages.dne.status = status;
    project.stages.dne.completedBy = req.user._id;

    if (status === 'partial_completed') {
      project.stages.dne.partialCompletedAt = new Date();
      
      // Flow to Production on partial completion
      project.currentStage = 'Production';
      project.stages.production.status = 'in_progress';
      
      // Create default milestones when first moving to production
      const existingMilestones = await Milestone.find({ project: project._id });
      if (existingMilestones.length === 0) {
        await createDefaultMilestones(project._id);
      }
      
    } else if (status === 'completed') {
      project.stages.dne.completedAt = new Date();
      
      // If already in production (from partial_completed), don't change stage
      if (previousStatus === 'partial_completed') {
        // Just update DNE status, keep in Production stage
        // Don't create new milestones as they already exist
      } else {
        // If coming directly from pending to completed
        project.currentStage = 'Production';
        project.stages.production.status = 'in_progress';
        
        // Create default milestones if not already created
        const existingMilestones = await Milestone.find({ project: project._id });
        if (existingMilestones.length === 0) {
          await createDefaultMilestones(project._id);
        }
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

    // Check if all milestones are completed before allowing submission
    const milestones = await Milestone.find({ project: project._id });
    const allMilestonesCompleted = milestones.length > 0 && milestones.every(m => m.status === 'completed');

    if (!allMilestonesCompleted) {
      return res.status(400).json({ error: 'All milestones must be completed before submitting' });
    }

    project.stages.production.status = 'completed';
    project.stages.production.completedAt = new Date();
    project.stages.production.completedBy = req.user._id;
    
    // Always move to Installation when production is submitted
    project.currentStage = 'Installation';
    project.stages.installation.status = 'in_progress';

    await project.save();
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get projects by stage with DNE status for Production view
router.get('/production-projects', [
  auth,
  authorizeDepartment('Production')
], async (req, res) => {
  try {
    const projects = await Project.find({ 
      currentStage: 'Production',
      isDeleted: false 
    })
    .populate('createdBy', 'username department')
    .populate('stages.dne.completedBy', 'username')
    .populate('stages.production.completedBy', 'username')
    .sort('-createdAt');

    // Add DNE status to each project for Production team reference
    const projectsWithDneStatus = projects.map(project => {
      const projectObj = project.toObject();
      projectObj.dneStatus = project.stages.dne.status; // partial_completed or completed
      return projectObj;
    });

    res.json(projectsWithDneStatus);
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

// Get completed projects for history (all departments can access)
router.get('/history', auth, async (req, res) => {
  try {
    let query = { isDeleted: false };
    
    // For Sales department, show their submitted projects
    if (req.user.department === 'Sales') {
      query.createdBy = req.user._id;
    }
    // For DNE department, show projects they completed
    else if (req.user.department === 'DNE') {
      query['stages.dne.status'] = 'completed';
    }
    // For Production department, show projects they completed
    else if (req.user.department === 'Production') {
      query['stages.production.status'] = 'completed';
    }
    // For Installation department, show projects they completed
    else if (req.user.department === 'Installation') {
      query['stages.installation.status'] = 'completed';
    }
    // For Management, show all projects
    // (no additional filter needed)

    const projects = await Project.find(query)
      .populate('createdBy', 'username department')
      .populate('stages.dne.completedBy', 'username')
      .populate('stages.production.completedBy', 'username')
      .populate('stages.installation.completedBy', 'username')
      .sort('-updatedAt');

    // Filter amount field based on role - Sales and Management can see amounts
    const projectsData = projects.map(project => {
      const projectObj = project.toObject();
      if (req.user.role !== 'admin' && req.user.department !== 'Sales' && req.user.department !== 'Management') {
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

// Get projects for DNE department with different statuses
router.get('/dne-projects', [
  auth,
  authorizeDepartment('DNE')
], async (req, res) => {
  try {
    const { status } = req.query; // 'wip' or 'history'
    
    let query = { isDeleted: false };
    
    if (status === 'wip') {
      // Show projects currently in DNE stage
      query.currentStage = 'DNE';
    } else if (status === 'history') {
      // Show projects that DNE has completed
      query['stages.dne.status'] = { $in: ['partial_completed', 'completed'] };
    }

    const projects = await Project.find(query)
      .populate('createdBy', 'username department')
      .populate('stages.dne.completedBy', 'username')
      .sort('-updatedAt');

    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 