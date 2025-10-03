import { createServer } from 'http';
import { getDatabaseStats } from './db.js';

/**
 * Health check server for Render web service
 */
export function startHealthServer(port: number = 3000): void {
  const server = createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    if (req.url === '/health') {
      try {
        // Check database connection by getting stats
        const dbStats = await getDatabaseStats();
        
        // Health check response
        const healthData = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          database: {
            items: dbStats.totalItems,
            tweets: dbStats.totalTweets,
            recentItems: dbStats.recentItems
          }
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(healthData, null, 2));
        
      } catch (error) {
        // Unhealthy response
        const errorData = {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          uptime: process.uptime()
        };
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(errorData, null, 2));
      }
    } else if (req.url === '/status') {
      // Simple status endpoint
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'running',
        timestamp: new Date().toISOString(),
        service: 'xbot'
      }, null, 2));
    } else {
      // 404 for other routes
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Not found',
        timestamp: new Date().toISOString()
      }, null, 2));
    }
  });
  
  server.listen(port, () => {
    console.log(`🏥 Health server running on port ${port}`);
    console.log(`   Health check: http://localhost:${port}/health`);
    console.log(`   Status: http://localhost:${port}/status`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Health server shutting down...');
    server.close(() => {
      console.log('✅ Health server closed');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log('🛑 Health server shutting down...');
    server.close(() => {
      console.log('✅ Health server closed');
      process.exit(0);
    });
  });
}
