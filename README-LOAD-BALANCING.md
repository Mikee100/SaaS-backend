# SaaS Backend Load Balancing Setup

This document outlines the containerized load balancing implementation for the SaaS backend using Docker, Docker Compose, and Nginx.

## Architecture Overview

```
Internet
    │
    ▼
[ Nginx Load Balancer ]
    │
    ├─► [ Backend Instance 1 ] (Port 4000)
    ├─► [ Backend Instance 2 ] (Port 4001)
    └─► [ Backend Instance 3 ] (Port 4002)
```

## Components

### 1. Docker Containerization
- **Dockerfile**: Multi-stage build for optimized production images
- **.dockerignore**: Excludes unnecessary files from build context
- **docker-compose.yml**: Development setup with single instance
- **docker-compose.prod.yml**: Production setup with load balancing

### 2. Nginx Load Balancer
- **nginx.conf**: Load balancer configuration with health checks
- **Least Connection** algorithm for optimal distribution
- **Health checks** every 30 seconds
- **Gzip compression** and security headers

### 3. Deployment Automation
- **deploy.sh**: Automated deployment script with rollback capability
- **Health monitoring** and service validation
- **Database backup** before deployment

## Quick Start

### Development (Single Instance)
```bash
cd backend
docker-compose up --build
```

### Production (Load Balanced)
```bash
cd backend
./deploy.sh
```

## Configuration

### Environment Variables
Set the following environment variables in your production environment:

```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
# ... other required env vars
```

### Scaling Configuration
Modify `docker-compose.prod.yml` to adjust replica count:

```yaml
deploy:
  replicas: 3  # Change this number for more/less instances
```

### Nginx Configuration
The `nginx.conf` includes:
- **Upstream servers**: Backend instances on ports 4000-4002
- **Load balancing**: Least connection algorithm
- **Health checks**: Automatic failover
- **Security headers**: XSS protection, frame options, etc.
- **Performance**: Gzip compression, connection keepalive

## Health Checks

### Application Health
- Endpoint: `/admin/monitoring/health`
- Returns system metrics, database status, and overall health

### Load Balancer Health
- Endpoint: `/health`
- Simple health check for load balancer status

## Monitoring

### Built-in Monitoring
- System metrics (CPU, memory, disk)
- Database connection monitoring
- Response time tracking
- Alert system for threshold breaches

### Access Monitoring
- Admin endpoint: `/admin/monitoring/health`
- Health history: `/admin/monitoring/health/history`
- System metrics: `/admin/monitoring/system/metrics`

## Deployment Process

1. **Pre-deployment**: Database backup and validation
2. **Build**: Docker images are built with `--no-cache`
3. **Deploy**: Graceful shutdown of old containers
4. **Health Check**: Wait for services to become healthy
5. **Cleanup**: Remove old images and containers

## Scaling Strategies

### Horizontal Scaling
- Increase replica count in `docker-compose.prod.yml`
- Nginx automatically distributes traffic
- Database connection pooling handles increased load

### Vertical Scaling
- Adjust resource limits in compose file:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
```

### Auto-scaling (Future Enhancement)
- Implement based on CPU/memory thresholds
- Use Docker Swarm or Kubernetes for orchestration

## Security Considerations

### Network Security
- Services run on isolated Docker network
- Nginx handles SSL termination (configure certificates)
- Internal services not exposed externally

### Application Security
- Rate limiting via Nginx
- Security headers automatically applied
- CORS configuration for allowed origins

## Troubleshooting

### Common Issues

1. **Health Check Failures**
   - Check backend logs: `docker-compose logs backend`
   - Verify database connectivity
   - Ensure environment variables are set

2. **Load Imbalance**
   - Monitor connection counts via health endpoint
   - Adjust Nginx upstream configuration
   - Check for session stickiness requirements

3. **Memory Issues**
   - Monitor memory usage via admin endpoints
   - Adjust Docker resource limits
   - Implement connection pooling

### Logs
```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs

# View specific service logs
docker-compose -f docker-compose.prod.yml logs backend

# View nginx logs
docker-compose -f docker-compose.prod.yml logs nginx
```

## Performance Optimization

### Database
- Connection pooling configured
- Query optimization and indexing
- Read replicas for high-traffic endpoints

### Caching
- Redis integration for session storage
- API response caching
- Static asset caching via Nginx

### Monitoring
- Prometheus metrics collection
- Grafana dashboards for visualization
- Alert manager for notifications

## Migration from Single Instance

1. **Backup**: Create full database backup
2. **Test**: Run load balanced setup locally
3. **Deploy**: Use deployment script for zero-downtime migration
4. **Monitor**: Watch health metrics and performance
5. **Scale**: Adjust replica count based on load

## Future Enhancements

- **Kubernetes**: Migrate to K8s for advanced orchestration
- **Service Mesh**: Implement Istio for traffic management
- **CDN**: Add CloudFront or similar for global distribution
- **Auto-scaling**: Implement HPA based on metrics
- **Multi-region**: Deploy across multiple AWS regions

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Docker and Nginx logs
3. Monitor health check endpoints
4. Contact the development team with specific error messages
