import express from 'express';
import dotenv from 'dotenv';
import queueRoutes from './routes/queueRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  console.log('Hello, Redis!');
  res.send('Hello, Redis!');
});

// Test route for debugging
app.get('/debug-test', (req, res) => {
  const testVar = 'Hello Debugger';  // Set a breakpoint on this line
  console.log('Debug test route hit');
  res.json({ message: testVar });
});

// Routes
app.use('/api', queueRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
