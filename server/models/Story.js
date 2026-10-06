const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mediaUrl: {
      type: String,
      required: [true, 'Story must have media'],
    },
    caption: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // Exactly 24 hours
      index: { expires: 0 }, // TTL index: MongoDB deletes the document when expiresAt <= current time
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify if a story has expired (>24 hours)
storySchema.methods.isExpired = function () {
  return new Date() >= this.expiresAt;
};

module.exports = mongoose.model('Story', storySchema);
