const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// In-memory store
let users = []; // { name, email, password, role }
let events = [
  { id: 1, date: '2025-08-20', time: '18:00', description: 'Virtual networking and tech talks', participants: [] }
];

// Middleware to decode JWT and attach user
function authenticateToken(req, res, next) {
  const token = req.query.token || req.body.token;
  if (!token) return res.redirect('/login');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.redirect('/login');
    req.user = user;
    next();
  });
}

// Home page
app.get('/', (req, res) => {
  res.send(`<h1>✅ Virtual Event Platform API</h1>
            <p><a href="/register">Register</a> | <a href="/login">Login</a></p>`);
});

// ===== Register page =====
app.get('/register', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Register</title>
      <style>
        body { font-family: Arial; background: linear-gradient(120deg,#4facfe,#00f2fe);
               display: flex; justify-content: center; align-items: center; height: 100vh; }
        .container { background: white; padding: 2rem; border-radius: 8px; width: 350px; }
        input, select, button { width: 100%; padding: 10px; margin: 8px 0; }
        button { background: #4facfe; color: white; border: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Register</h2>
        <form method="POST" action="/register">
          <input type="text" name="name" placeholder="Full Name" required />
          <input type="email" name="email" placeholder="Email" required />
          <input type="password" name="password" placeholder="Password" required />
          <select name="role" required>
            <option value="">Select Role</option>
            <option value="organizer">Organizer</option>
            <option value="attendee">Attendee</option>
          </select>
          <button type="submit">Sign Up</button>
        </form>
        <a href="/login">Already have an account? Login</a>
      </div>
    </body>
    </html>
  `);
});

// ===== Login page =====
app.get('/login', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Login</title>
      <style>
        body { font-family: Arial; background: linear-gradient(120deg,#43e97b,#38f9d7);
               display: flex; justify-content: center; align-items: center; height: 100vh; }
        .container { background: white; padding: 2rem; border-radius: 8px; width: 350px; }
        input, button { width: 100%; padding: 10px; margin: 8px 0; }
        button { background: #43e97b; color: white; border: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Login</h2>
        <form method="POST" action="/login">
          <input type="email" name="email" placeholder="Email" required />
          <input type="password" name="password" placeholder="Password" required />
          <button type="submit">Login</button>
        </form>
        <a href="/register">Don't have an account? Register</a>
      </div>
    </body>
    </html>
  `);
});

// ===== Events dashboard =====
app.get('/events-page', authenticateToken, (req, res) => {
  const isOrganizer = req.user.role === 'organizer';

  let eventHTML = events.map(ev => `
    <div class="event">
      <h3>${ev.description}</h3>
      <p>Date: ${ev.date}</p>
      <p>Time: ${ev.time}</p>
      <p>Participants: ${ev.participants.length}</p>
      ${!isOrganizer ? `
        <form method="POST" action="/events/${ev.id}/register?token=${req.query.token}">
          <button type="submit">Register for Event</button>
        </form>
      ` : ''}
    </div>
  `).join('');

  let createEventForm = '';
  if (isOrganizer) {
    createEventForm = `
      <h2>Create Event</h2>
      <form method="POST" action="/events?token=${req.query.token}">
        <input type="text" name="description" placeholder="Description" required />
        <input type="date" name="date" required />
        <input type="time" name="time" required />
        <button type="submit">Create Event</button>
      </form>
    `;
  }

  res.send(`
    <html>
    <head>
      <title>Events Dashboard</title>
      <style>
        body { font-family: Arial; background: #f4f4f4; margin: 0; padding: 20px; }
        .event { background: white; padding: 1rem; margin: 1rem auto;
                 border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); max-width: 500px; }
        button { background: #4facfe; color: white; padding: 8px 16px; border: none; }
      </style>
    </head>
    <body>
      <h1>Welcome ${req.user.name} 🎉</h1>
      ${createEventForm}
      <h2>Available Events</h2>
      ${eventHTML}
      <a href="/login">Logout</a>
    </body>
    </html>
  `);
});

// ===== Register endpoint =====
app.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (users.find(u => u.email === email)) return res.status(400).send('User already exists');
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ name, email, password: hashedPassword, role });
  res.redirect('/login');
});

// ===== Login endpoint =====
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).send('User not found');
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(400).send('Invalid password');
  const token = jwt.sign({ name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.redirect(`/events-page?token=${token}`);
});

// ===== Create event =====
app.post('/events', authenticateToken, (req, res) => {
  if (req.user.role !== 'organizer') return res.status(403).send('Not authorized');
  const { description, date, time } = req.body;
  const newEvent = { id: events.length + 1, description, date, time, participants: [] };
  events.push(newEvent);
  res.redirect(`/events-page?token=${req.query.token}`);
});

// ===== Register for event =====
app.post('/events/:id/register', authenticateToken, (req, res) => {
  const event = events.find(ev => ev.id == req.params.id);
  if (!event) return res.status(404).send('Event not found');
  if (!event.participants.includes(req.user.email)) {
    event.participants.push(req.user.email);
  }
  res.redirect(`/events-page?token=${req.query.token}`);
});

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
