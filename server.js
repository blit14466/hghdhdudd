const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Connect to MongoDB with your provided credentials
mongoose.connect('mongodb+srv://byamukamarap:byamu110@cluster0.i83p8.mongodb.net/penpalmega?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  age: Number,
  email: { type: String, unique: true },
  password: String,
  country: String,
  city: String,
  description: String,
  gender: String,
  languages: [String],
  hobbies: [String],
  profilePicture: String,
  privacySettings: {
    whoCanMessage: { type: String, default: 'Everyone' },
    whoCanSeeFriendList: { type: String, default: 'Friends' },
    whoCanSeeEmail: { type: String, default: 'Friends' },
    whoCanSeeOnlineStatus: { type: String, default: 'Everyone' }
  },
  theme: { type: String, default: 'light' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastSeen: Date,
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationTokenExpires: Date
});

const User = mongoose.model('User', UserSchema);

// Friend Request Schema
const FriendRequestSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const FriendRequest = mongoose.model('FriendRequest', FriendRequestSchema);

// Message Schema
const MessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  attachments: [{
    url: String,
    type: { type: String, enum: ['image', 'audio', 'other'] }
  }]
});

const Message = mongoose.model('Message', MessageSchema);

// Group Schema
const GroupSchema = new mongoose.Schema({
  name: String,
  topic: String,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
});

const Group = mongoose.model('Group', GroupSchema);

// Group Message Schema
const GroupMessageSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  isRead: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  attachments: [{
    url: String,
    type: { type: String, enum: ['image', 'audio', 'other'] }
  }]
});

const GroupMessage = mongoose.model('GroupMessage', GroupMessageSchema);

// Comment Schema
const CommentSchema = new mongoose.Schema({
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  createdAt: { type: Date, default: Date.now }
});

const Comment = mongoose.model('Comment', CommentSchema);

// Report Schema
const ReportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: String,
  details: String,
  status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Report = mongoose.model('Report', ReportSchema);

// Block Schema
const BlockSchema = new mongoose.Schema({
  blocker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  blockedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const Block = mongoose.model('Block', BlockSchema);

// News Schema
const NewsSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const News = mongoose.model('News', NewsSchema);

// Middleware
//app.use(express.static(path.join(__dirname, 'public')));





app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'penpalmega_secret_key_12345', // Hardcoded secret for session
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
}).single('profilePicture');

// Authentication middleware
const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login.html');
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Auth Routes
app.post('/signup', async (req, res) => {
  try {
    const { name, username, age, email, password, confirmPassword, country, city, description } = req.body;
    
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = require('crypto').randomBytes(20).toString('hex');
    
    const user = new User({
      name,
      username,
      age,
      email,
      password: hashedPassword,
      country,
      city,
      description,
      verificationToken,
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });
    
    await user.save();
    
    // In a real app, you would send an email here
    console.log(`Verification token for ${email}: ${verificationToken}`);
    
    res.status(201).json({ message: 'User registered successfully. Please check your email for verification.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error registering user' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    if (!user.isVerified) {
      return res.status(400).json({ error: 'Account not verified. Please check your email.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    req.session.userId = user._id;
    await User.findByIdAndUpdate(user._id, { lastSeen: Date.now() });
    
    res.json({ message: 'Login successful', user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture
    }});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error logging in' });
  }
});

app.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    const user = await User.findOne({ 
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).send('Invalid or expired verification token');
    }
    
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    
    res.send('Email verified successfully. You can now login.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error verifying email');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Error logging out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Password Reset Routes
app.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'No account with that email exists' });
    }
    
    const resetToken = require('crypto').randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    
    // In a real app, you would send an email here
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    res.json({ message: 'Password reset instructions sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error processing password reset' });
  }
});

app.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const user = await User.findOne({ 
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }
    
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error resetting password' });
  }
});

// Protected Routes
const protectedRoutes = [
  '/userdashboard.html',
  '/find-penpals.html',
  '/messages.html',
  '/news-updates.html',
  '/friends.html',
  '/profile.html',
  '/settings.html',
  '/account.html',
  '/edit-profile.html'

// Send a direct message
app.post('/api/messages', requireLogin, async (req, res) => {
  const m = new Message({
    from: req.session.userId,
    to:   req.body.toUserId,
    content: req.body.content
  });
  await m.save();
  res.json(m);
});

// Get conversation with another user
app.get('/api/messages', requireLogin, async (req, res) => {
  const other = req.query.with;
  const conv = await Message.find({
    $or: [
      { from: req.session.userId, to: other },
      { from: other, to: req.session.userId }
    ]
  }).sort('createdAt');
  res.json(conv);
});

// Search pen-pals by country or age
app.get('/api/users', requireLogin, async (req, res) => {
  const { country, minAge, maxAge } = req.query;
  const filter = {};
  if (country) filter.country = country;
  if (minAge) filter.age = { $gte: Number(minAge) };
  if (maxAge) filter.age = { ...(filter.age||{}), $lte: Number(maxAge) };
  const users = await User.find(filter).select('-password -verificationToken');
  res.json(users);
});

// View one user’s profile
app.get('/api/users/:id', requireLogin, async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -verificationToken');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});,
  '/view-profile.html',
  '/group-chat.html',
  '/report-problem.html'
];

protectedRoutes.forEach(route => {
  app.get(route, requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', route));
  });
});

// API Routes
app.get('/api/user', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId)
      .select('-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching user data' });
  }
});

app.put('/api/user', requireLogin, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    try {
      const updates = req.body;
      
      if (req.file) {
        updates.profilePicture = `/images/uploads/${req.file.filename}`;
      }
      
      const user = await User.findByIdAndUpdate(req.session.userId, updates, { new: true })
        .select('-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires');
      
      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error updating profile' });
    }
  });
});

// ... [Keep all your existing API routes from the previous version]
// Make sure to update them to use json() responses consistently

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB connected to: penpalmega database`);
});

// Send a friend request
app.post('/api/friend-request', requireLogin, async (req, res) => {
  const fr = new FriendRequest({
    from: req.session.userId,
    to:   req.body.toUserId
  });
  await fr.save();
  res.json({ message: 'Request sent' });
});

// List pending requests
app.get('/api/friend-request', requireLogin, async (req, res) => {
  const list = await FriendRequest
    .find({ to: req.session.userId, status: 'pending' })
    .populate('from', 'name username');
  res.json(list);
});

// Accept or reject
app.post('/api/friend-request/:id/:action', requireLogin, async (req, res) => {
  const { id, action } = req.params;
  if (!['accept','reject'].includes(action))
    return res.status(400).end();
  await FriendRequest.findByIdAndUpdate(id, {
    status: action === 'accept' ? 'accepted' : 'rejected'
  });
  res.json({ status: action });
});