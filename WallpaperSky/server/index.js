require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database setup (using JSON for simplicity - use MongoDB in production)
const DB_FILE = path.join(__dirname, 'db.json');

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    return { wallpapers: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// API Routes

// Get all wallpapers
app.get('/api/wallpapers', (req, res) => {
  const db = readDB();
  res.json(db.wallpapers);
});

// Upload a new wallpaper
app.post('/api/wallpapers', upload.single('image'), (req, res) => {
  const { title, category, description } = req.body;
  const filename = req.file.filename;
  
  const db = readDB();
  const newWallpaper = {
    id: Date.now(),
    title,
    category,
    description: description || '',
    downloads: 0,
    likes: 0,
    date: new Date().toISOString().split('T')[0],
    resolutions: ["1920x1080", "2560x1440", "3840x2160"],
    filename
  };
  
  db.wallpapers.push(newWallpaper);
  writeDB(db);
  
  res.status(201).json(newWallpaper);
});

// Delete a wallpaper
app.delete('/api/wallpapers/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  const db = readDB();
  const index = db.wallpapers.findIndex(wp => wp.id === id);
  
  if (index !== -1) {
    // Remove file from uploads
    const filename = db.wallpapers[index].filename;
    fs.unlinkSync(path.join(__dirname, 'uploads', filename));
    
    // Remove from database
    db.wallpapers.splice(index, 1);
    writeDB(db);
    
    res.status(204).send();
  } else {
    res.status(404).json({ error: 'Wallpaper not found' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
});