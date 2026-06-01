const compression = require('compression');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const env = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const regionRoutes = require('./routes/regionRoutes');
const customerCategoryRoutes = require('./routes/customerCategoryRoutes');
const customerRoutes = require('./routes/customerRoutes');
const addressRoutes = require('./routes/addressRoutes');
const tariffRoutes = require('./routes/tariffRoutes');
const billingPeriodRoutes = require('./routes/billingPeriodRoutes');
const billRoutes = require('./routes/billRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const paymentMethodRoutes = require('./routes/paymentMethodRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const officerRoutes = require('./routes/officerRoutes');
const errorHandler = require('./middlewares/errorHandler');
const notFoundHandler = require('./middlewares/notFoundHandler');

const app = express();

app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));
app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin }));
app.use(compression());
app.use(express.json({ limit: env.requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.requestBodyLimit }));

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
}

app.use(`${env.apiPrefix}/auth`, authRoutes);
app.use(`${env.apiPrefix}/users`, userRoutes);
app.use(`${env.apiPrefix}/roles`, roleRoutes);
app.use(`${env.apiPrefix}/regions`, regionRoutes);
app.use(`${env.apiPrefix}/customer-categories`, customerCategoryRoutes);
app.use(`${env.apiPrefix}/customers`, customerRoutes);
app.use(`${env.apiPrefix}/customer-addresses`, addressRoutes);
app.use(`${env.apiPrefix}/tariffs`, tariffRoutes);
app.use(`${env.apiPrefix}/billing-periods`, billingPeriodRoutes);
app.use(`${env.apiPrefix}/bills`, billRoutes);
app.use(`${env.apiPrefix}/payments`, paymentRoutes);
app.use(`${env.apiPrefix}/payment-methods`, paymentMethodRoutes);
app.use(`${env.apiPrefix}/dashboard`, dashboardRoutes);
app.use(`${env.apiPrefix}/reports`, reportRoutes);
app.use(`${env.apiPrefix}/audit-logs`, auditLogRoutes);
app.use(`${env.apiPrefix}/officers`, officerRoutes);

const frontendDir = path.resolve(__dirname, '../../frontend/dist');
const exportsDir = path.resolve(__dirname, '../exports');
app.use('/exports', express.static(exportsDir, { maxAge: '1h' }));
app.use(express.static(frontendDir, { maxAge: '1h' }));
app.get('*', (req, res, next) => {
  if (req.path.startsWith(env.apiPrefix)) return next();
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
