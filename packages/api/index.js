const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'CommitDiary API' });
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});

module.exports = app;
