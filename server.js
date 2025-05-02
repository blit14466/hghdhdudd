const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();

// Models
//const User = require('./models/User');
//const Message = require('./models/Message');

// Replace the placeholder values with your actual MongoDB URI and session secret
const MONGODB_URI = 'mongodb+srv://byamukamarap:byamu110@cluster0.i83p8.mongodb.net/penpalmega?retryWrites=true&w=majority&appName=Cluster0'; // Replace with your MongoDB URI
const SESSION_SECRET = 'your-session-secret-here'; // Replace with a strong session secret

// Connect to MongoDB
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Middleware
app.use(helmet()); // Adds security headers
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Rate Limiting to prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Serve static files
app.use(express.static('public'));

// Multer setup for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG and PNG files are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Auth Middleware
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login.html');
  }
  next();
}

// Input Validation Middleware (example for signup/login)
const validateInput = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send('Email and password are required.');
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).send('Invalid email format.');
  }
  next();
};

// Routes

// Public Pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Auth Routes
app.post('/signup', validateInput, async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    req.session.userId = user._id;
    res.redirect('/userdashboard.html');
  } catch (err) {
    console.error('Error during signup:', err);
    res.status(500).send('Failed to create a new account. Please try again later.');
  }
});

app.post('/login', validateInput, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !(await user.comparePassword(req.body.password))) {
      return res.status(401).send('Incorrect email or password');
    }
    req.session.userId = user._id;
    res.redirect('/userdashboard.html');
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).send('Failed to log in. Please try again later.');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Protected Pages
const protectedRoutes = [
  '/userdashboard.html',
  '/find-penpals.html',
  '/messages.html',
  '/news-updates.html',
  '/friends.html',
  '/profile.html',
  '/settings.html',
  '/account.html',
  '/edit-profile.html',
  '/view-profile.html',
  '/group-chat.html',
  '/report-problem.html'
];

protectedRoutes.forEach(route => {
  app.get(route, requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', route));
  });
});

// API Endpoints

// Send a direct message
app.post('/api/messages', requireLogin, async (req, res) => {
  try {
    const m = new Message({
      from: req.session.userId,
      to: req.body.toUserId,
      content: req.body.content
    });
    await m.save();
    res.json(m);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Error sending message' });
  }
});

// Get conversation with another user
app.get('/api/messages', requireLogin, async (req, res) => {
  try {
    const other = req.query.with;
    const conv = await Message.find({
      $or: [
        { from: req.session.userId, to: other },
        { from: other, to: req.session.userId }
      ]
    }).sort('createdAt');
    res.json(conv);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// Search pen-pals by country or age
app.get('/api/users', requireLogin, async (req, res) => {
  try {
    const { country, minAge, maxAge } = req.query;
    const filter = {};
    if (country) filter.country = country;
    if (minAge) filter.age = { $gte: Number(minAge) };
    if (maxAge) filter.age = { ...(filter.age || {}), $lte: Number(maxAge) };
    const users = await User.find(filter).select('-password -verificationToken');
    res.json(users);
  } catch (err) {
    console.error('Error searching users:', err);
    res.status(500).json({ error: 'Error searching users' });
  }
});

// View one user’s profile
app.get('/api/users/:id', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -verificationToken');
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Error fetching profile' });
  }
});

// Get current logged-in user profile
app.get('/api/user', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId)
      .select('-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires');
    res.json(user);
  } catch (err) {
    console.error('Error fetching user data:', err);
    res.status(500).json({ error: 'Error fetching user data' });
  }
});

// Update current user profile
app.put('/api/user', requireLogin, upload.single('profilePicture'), async (req, res) => {
  try {
    const updates = req.body;
    if (req.file) {
      updates.profilePicture = `/images/uploads/${req.file.filename}`;
    }
    const user = await User.findByIdAndUpdate(req.session.userId, updates, { new: true })
      .select('-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires');
    res.json(user);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Error updating profile' });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});