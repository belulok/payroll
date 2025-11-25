const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const socketio = require('@feathersjs/socketio');
const configuration = require('@feathersjs/configuration');
const cors = require('cors');

const mongoose = require('./mongoose');
const services = require('./services');
const appHooks = require('./app.hooks');
const channels = require('./channels');
const authentication = require('./authentication');
const middleware = require('./middleware');

const app = express(feathers());

// Load app configuration
app.configure(configuration());

// Enable CORS
app.use(cors());

// Enable security, CORS, compression, favicon and body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Host the public folder
app.use('/', express.static(app.get('public')));

// Set up Plugins and providers
app.configure(express.rest());
app.configure(socketio());

// Configure database
app.configure(mongoose);

// Configure authentication
app.configure(authentication);

// Set up our services
app.configure(services);

// Set up event channels
app.configure(channels);

// Configure middleware
app.configure(middleware);

// Configure a middleware for 404s and the error handler
app.use(express.notFound());
app.use(express.errorHandler({ logger: console }));

app.hooks(appHooks);

module.exports = app;

