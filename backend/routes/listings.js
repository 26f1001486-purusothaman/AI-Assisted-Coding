const express = require('express');
const Listing = require('../models/Listing');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const types = ['offer', 'request'];
const categories = ['Arts & Design', 'Technology', 'Languages', 'Music', 'Home & DIY', 'Career & Study', 'Other'];
const priorities = ['low', 'medium', 'high'];
const statuses = ['open', 'completed'];
const editableFields = ['title', 'description', 'type', 'category', 'priority'];

function addFilter(query, filters, name, allowedValues) {
  if (query[name] === undefined) return null;
  if (!allowedValues.includes(query[name])) return name;
  filters[name] = query[name];
  return null;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/', async (req, res) => {
  const filters = { status: 'open' };
  const invalidFilter = addFilter(req.query, filters, 'type', types)
    || addFilter(req.query, filters, 'category', categories)
    || addFilter(req.query, filters, 'priority', priorities);

  if (invalidFilter) {
    return res.status(400).json({ error: `Invalid ${invalidFilter} filter.` });
  }
  if (req.query.status !== undefined && req.query.status !== 'open') {
    return res.status(400).json({ error: 'Public browsing only includes open listings.' });
  }
  if (req.query.q !== undefined) {
    if (req.query.q.length > 100) return res.status(400).json({ error: 'Search text is too long.' });
    const search = new RegExp(escapeRegex(req.query.q.trim()), 'i');
    filters.$or = [{ title: search }, { description: search }];
  }

  try {
    const listings = await Listing.find(filters).populate('owner', 'name').sort({ createdAt: -1 }).limit(100);
    res.json({ listings });
  } catch {
    res.status(500).json({ error: 'Unable to load listings right now.' });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  const status = req.query.status || 'all';
  if (status !== 'all' && !statuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status filter.' });
  }

  const filters = { owner: req.user._id };
  if (status !== 'all') filters.status = status;

  try {
    const listings = await Listing.find(filters).populate('owner', 'name').sort({ updatedAt: -1 });
    res.json({ listings });
  } catch {
    res.status(500).json({ error: 'Unable to load your listings right now.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { title, description, type, category, priority } = req.body ?? {};

  try {
    const listing = await Listing.create({
      owner: req.user._id,
      title,
      description,
      type,
      category,
      priority,
    });
    await listing.populate('owner', 'name');
    res.status(201).json({ listing });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ error: 'Please provide valid listing details.' });
    }
    res.status(500).json({ error: 'Unable to save the listing right now.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('owner', 'name');
    if (!listing || listing.status !== 'open') {
      return res.status(404).json({ error: 'Listing not found.' });
    }
    res.json({ listing });
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ error: 'Listing not found.' });
    res.status(500).json({ error: 'Unable to load the listing right now.' });
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body ?? {};
  if (!statuses.includes(status)) {
    return res.status(400).json({ error: 'Choose open or completed.' });
  }

  try {
    const listing = await Listing.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { status, completedAt: status === 'completed' ? new Date() : null },
      { new: true, runValidators: true },
    ).populate('owner', 'name');
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    res.json({ listing });
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ error: 'Listing not found.' });
    res.status(500).json({ error: 'Unable to update the listing right now.' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  const updates = {};
  for (const field of editableFields) {
    if (req.body?.[field] !== undefined) updates[field] = req.body[field];
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Provide at least one listing field to update.' });
  }

  try {
    const listing = await Listing.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      updates,
      { new: true, runValidators: true },
    ).populate('owner', 'name');
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    res.json({ listing });
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ error: 'Listing not found.' });
    if (error.name === 'ValidationError') return res.status(400).json({ error: 'Please provide valid listing details.' });
    res.status(500).json({ error: 'Unable to update the listing right now.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const listing = await Listing.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    res.json({ message: 'Listing deleted.' });
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ error: 'Listing not found.' });
    res.status(500).json({ error: 'Unable to delete the listing right now.' });
  }
});

module.exports = router;