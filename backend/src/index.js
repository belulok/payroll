require('dotenv').config();

const app = require('./app');
const port = app.get('port') || 3030;

app.listen(port).then(() => {
  console.log('Feathers application started on http://localhost:%d', port);
}).catch(err => {
  console.error('Error starting server:', err);
});

process.on('unhandledRejection', (reason, p) =>
  console.error('Unhandled Rejection at: Promise ', p, reason)
);
