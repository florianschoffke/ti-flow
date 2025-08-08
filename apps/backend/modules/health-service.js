/**
 * Health Service Module
 * Provides health check and system status endpoints
 */
class HealthService {
  constructor() {
    this.startTime = new Date();
    this.version = '1.0.0';
    this.serviceName = 'ti-flow-service';
  }

  /**
   * Get basic health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      service: this.serviceName,
      version: this.version,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime()
    };
  }

  /**
   * Get detailed system status
   * @returns {Object} Detailed system information
   */
  getSystemStatus() {
    return {
      status: 'operational',
      service: this.serviceName,
      version: this.version,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      startTime: this.startTime.toISOString(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        memory: this.getMemoryUsage(),
        pid: process.pid
      },
      endpoints: {
        health: '/health',
        status: '/status',
        documentOperations: '/$document-operations',
        requestOperations: '/$request-operations',
        flowOperations: '/$flow-operations',
        populate: '/$populate',
        flowRequest: '/$flow-request',
        activeRequests: '/$active-requests'
      }
    };
  }

  /**
   * Get service uptime in human readable format
   * @returns {string} Uptime string
   */
  getUptime() {
    const uptimeMs = Date.now() - this.startTime.getTime();
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get memory usage information
   * @returns {Object} Memory usage statistics
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`
    };
  }
}

/**
 * Setup health service routes
 * @param {Express} app - Express application instance
 * @param {Function} registerEndpoint - Function to register endpoints for documentation
 */
export function setupHealthService(app, registerEndpoint) {
  const healthService = new HealthService();

  // Basic health check endpoint
  app.get('/health', (req, res) => {
    const status = healthService.getHealthStatus();
    console.log('❤️  Health check requested');
    
    res.setHeader('Content-Type', 'application/json');
    res.json(status);
  });

  // Detailed status endpoint
  app.get('/status', (req, res) => {
    const status = healthService.getSystemStatus();
    console.log('📊 System status requested');
    
    res.setHeader('Content-Type', 'application/json');
    res.json(status);
  });

  // Register endpoints for documentation
  if (registerEndpoint) {
    registerEndpoint('Health & Status', 'GET', '/health', 'Basic health check');
    registerEndpoint('Health & Status', 'GET', '/status', 'Detailed system status');
  }

  console.log('✅ Health Service module loaded');
  console.log('❤️  Health check endpoint: /health');
  console.log('📊 System status endpoint: /status');
}

export { HealthService };
