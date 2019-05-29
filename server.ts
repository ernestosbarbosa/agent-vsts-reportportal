import * as express from 'express';
import { VstsController } from './controllers';

const app: express.Application = express();
const port: number = 3000;
const hostname: string = '0.0.0.0';

app.use('/', VstsController);

app.listen(port, hostname, () => {
    console.log(`Listening at http://localhost:${port}/`);
});