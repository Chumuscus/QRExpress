const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const qrRoute = require('./api/qr/qr');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.use('/api/qr', qrRoute);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;