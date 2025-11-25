require('dotenv').config();
const app = require('./app');
const port = app.get('port');
const host = app.get('host');

process.on('unhandledRejection', (reason, p) =>
  console.error('Unhandled Rejection at: Promise ', p, reason)
);

app.listen(port).then(() => {
  console.log('Feathers application started on http://%s:%d', host, port);
});

