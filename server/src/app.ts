import express from 'express';
import cors    from 'cors';
import helmet  from 'helmet';
import morgan  from 'morgan';
import router  from './interfaces/routes';
import { notFound, errorHandler } from './interfaces/middlewares/errorMiddleware';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', router);
app.use(notFound);
app.use(errorHandler);

export default app;
