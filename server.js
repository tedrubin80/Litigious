const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Legal Estate Backend API',
    status: 'Running',
    version: '2.3',
    endpoints: { health: '/health', version: '/version', test: '/test' }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/version', (req, res) => {
  res.json({ version: '2.3', environment: process.env.NODE_ENV });
});

app.get('/test', (req, res) => {
  res.json({ working: true, message: 'Test successful!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
