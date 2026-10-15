import express, { Express } from 'express';
import { errorHandler } from '@/middleware/error.middleware';
import { authRouter } from '@/modules/auth/auth.routes';
import { projectRouter } from '@/modules/projects/project.routes';
import { financeRouter } from '@/modules/finance/routes/finance.routes';
import { procurementRouter } from '@/modules/procurement/procurement.routes';
import { biddingRouter } from '@/modules/bidding/routes/bidding.routes';
import { userRouter } from '@/modules/users/user.routes';
import { companyRouter } from '@/modules/users/company/company.routes';
import { timelineRouter } from '@/modules/timeline/timeline.routes';
import { dashboardRouter } from '@/modules/dashboard/dashboard.routes';

export const createTestApp = (): Express => {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/projects', projectRouter);
  app.use('/api/v1/finance', financeRouter);
  app.use('/api/v1/procurement', procurementRouter);
  app.use('/api/v1/bidding', biddingRouter);
  app.use('/api/v1/companies', companyRouter);
  app.use('/api/v1/timeline', timelineRouter);
  app.use('/api/v1/dashboard', dashboardRouter);

  // Error handler
  app.use(errorHandler);

  return app;
};

export const createMinimalTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use(errorHandler);
  return app;
};

export const authHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});