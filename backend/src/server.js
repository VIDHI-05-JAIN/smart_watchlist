require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { startPoller } = require('./workers/pricePoller');
const watchlistRoutes = require('./routes/watchlist');

const db = new Pool({ connectionString: process.env.DATABASE_URL });

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', watchlistRoutes(db));

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Smart Watchlist API on :${PORT}`);
  startPoller(db);
});