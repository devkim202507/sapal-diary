import mongoose from 'mongoose';

const USER_TYPES = ['user', 'admin'];

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      enum: USER_TYPES,
      default: 'user',
    },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
export { USER_TYPES };
