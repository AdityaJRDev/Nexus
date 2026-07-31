const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  containerId: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'stopped'],
    default: 'stopped',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Workspace', workspaceSchema);
