require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => res.json({ status: 'ok', service: 'nexchat-backend' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NexChat backend running on port ${PORT}`));
