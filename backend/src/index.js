require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const adminRoutes = require('./admin');
const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', routes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CSI generator backend listening on ${PORT}`);
});
