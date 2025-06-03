const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Complaint = require('../models/Complaint');
const { auth } = require('../middleware/auth');

// Get all complaints
router.get('/', auth, async (req, res) => {
  try {
    const { status, projectId } = req.query;
    let query = {};

    if (status) query.status = status;
    if (projectId) query.project = projectId;

    const complaints = await Complaint.find(query)
      .populate('project', 'projectName')
      .populate('submittedBy', 'username')
      .populate('assignedTo', 'username')
      .populate('resolvedBy', 'username')
      .sort('-createdAt');

    res.json(complaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create complaint
router.post('/', [
  auth,
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, title, description, priority } = req.body;

    const complaint = new Complaint({
      project: projectId,
      title,
      description,
      priority: priority || 'medium',
      submittedBy: req.user._id
    });

    await complaint.save();
    await complaint.populate(['project', 'submittedBy']);

    res.status(201).json(complaint);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update complaint
router.put('/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const { status, priority, assignedTo, resolution } = req.body;

    if (status) complaint.status = status;
    if (priority) complaint.priority = priority;
    if (assignedTo) complaint.assignedTo = assignedTo;
    
    if (resolution) {
      complaint.resolution = resolution;
      complaint.resolvedAt = new Date();
      complaint.resolvedBy = req.user._id;
    }

    await complaint.save();
    await complaint.populate(['project', 'submittedBy', 'assignedTo', 'resolvedBy']);

    res.json(complaint);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete complaint
router.delete('/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // Only admin or submitter can delete
    if (req.user.role !== 'admin' && complaint.submittedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this complaint' });
    }

    await complaint.deleteOne();
    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 