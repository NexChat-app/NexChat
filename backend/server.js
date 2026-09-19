require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

app.get('/', (_req, res) => res.json({ status: 'ok', service: 'nexchat-backend' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NexChat backend running on port ${PORT}`));
