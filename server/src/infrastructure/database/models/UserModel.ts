import mongoose, { Schema } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UserStatus, AuthProvider, UserRole, WorkStatus } from '../../../domain/entities/enums';

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const skillSchema = new Schema({
  name:        { type: String, required: true, trim: true },
  proficiency: { type: String, enum: ['beginner','intermediate','advanced','expert'], default: 'intermediate' },
}, { _id: true });

const projectSchema = new Schema({
  title:          { type: String, required: true, trim: true },
  description:    { type: String, trim: true },
  imageUrl:       String,
  imagePublicId:  String,
  liveLink:       String,
  githubLink:     String,
  otherLinks:     [{ label: String, url: String, _id: false }],
  skills:         [String],
}, { _id: true });

const experienceSchema = new Schema({
  jobTitle:       { type: String, required: true, trim: true },
  company:        { type: String, required: true, trim: true },
  employmentType: { type: String, enum: ['full-time','part-time','contract','freelance','internship','volunteer'], default: 'full-time' },
  startDate:      { type: String, required: true },
  endDate:        String,
  isCurrent:      { type: Boolean, default: false },
  location:       String,
  description:    String,
  skills:         [String],
}, { _id: true });

const educationSchema = new Schema({
  school:       { type: String, required: true, trim: true },
  degree:       { type: String, required: true, trim: true },
  fieldOfStudy: String,
  startDate:    String,
  endDate:      String,
  isCurrent:    { type: Boolean, default: false },
  grade:        String,
  activities:   String,
  description:  String,
}, { _id: true });

const languageSchema = new Schema({
  name:        { type: String, required: true, trim: true },
  proficiency: { type: String, enum: ['basic','conversational','professional','native'], default: 'conversational' },
}, { _id: true });

const contactSchema = new Schema({
  type:  { type: String, enum: ['whatsapp','linkedin','github','portfolio','twitter','instagram','other'], required: true },
  value: { type: String, required: true },
  label: String,
}, { _id: true });

// ── Main schema ───────────────────────────────────────────────────────────────

const userSchema = new Schema(
  {
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:      String,
    googleId:      String,
    authProvider:  { type: String, enum: Object.values(AuthProvider), default: AuthProvider.EMAIL },
    isEmailVerified: { type: Boolean, default: false },

    firstName:      { type: String, trim: true },
    lastName:       { type: String, trim: true },
    profilePicture: String,
    profilePicturePublicId: String,
    coverPicture:   String,
    coverPicturePublicId: String,
    headline:       { type: String, trim: true, default: null },
    about:          { type: String, trim: true, default: null },
    location:       { type: String, trim: true, default: null },
    phone:          { type: String, trim: true, default: null },
    resumeUrl:      String,
    resumePublicId: String,
    resumeOriginalName: String,

   
    company:      { type: String, trim: true, default: null },
    jobTitle:     { type: String, trim: true, default: null },
    school:       { type: String, trim: true, default: null },
    degree:       { type: String, trim: true, default: null },
    fieldOfStudy: { type: String, trim: true, default: null },
    startYear:    { type: String, default: null },

    // Profile sections
    skills:      { type: [skillSchema],      default: [] },
    projects:    { type: [projectSchema],    default: [] },
    experiences: { type: [experienceSchema], default: [] },
    educations:  { type: [educationSchema],  default: [] },
    languages:   { type: [languageSchema],   default: [] },
    contacts:    { type: [contactSchema],    default: [] },

    // Profile stats
    profileViews:   { type: Number, default: 0 },
    profileViewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // Social graph
    connections:        [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    pendingConnections:  [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    connectionRequests:  [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    blockedUsers:       [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],

    role: { type: String, enum: Object.values(UserRole) },
    workStatus: { type: String, enum: Object.values(WorkStatus), default: WorkStatus.NONE },
    onboardingComplete: { type: Boolean, default: false },

    status:           { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE },
    suspensionReason: { type: String, default: null },
    suspendedAt:      { type: Date,   default: null },
    suspendedUntil:   { type: Date,   default: null },
    banReason:        { type: String, default: null },
    bannedAt:         { type: Date,   default: null },

    isDeactivated:    { type: Boolean, default: false },
    deactivatedAt:    { type: Date,   default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (entered: string) {
  return bcrypt.compare(entered, this.password ?? '');
};

export const UserModel = mongoose.model('User', userSchema);
