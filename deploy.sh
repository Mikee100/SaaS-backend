#!/bin/bash

# SaaS Backend Deployment Script
# This script handles containerized deployment with load balancing

set -e

echo "🚀 Starting SaaS Backend Deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    log "Docker and Docker Compose are available"
}

# Create backup of current database
create_backup() {
    log "Creating database backup..."

    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
    fi

    # This assumes you have a database container running
    # Adjust the command based on your database setup
    if docker ps | grep -q "postgres\|mysql\|mongodb"; then
        docker exec $(docker ps -q --filter "name=db") pg_dump -U postgres saas_db > "$BACKUP_DIR/backup_$TIMESTAMP.sql" 2>/dev/null || \
        docker exec $(docker ps -q --filter "name=db") mysqldump -u root -p saas_db > "$BACKUP_DIR/backup_$TIMESTAMP.sql" 2>/dev/null || \
        warn "Could not create database backup. Make sure database container is running."
    else
        warn "No database container found. Skipping backup."
    fi
}

# Build and deploy
deploy() {
    log "Building and deploying application..."

    # Pull latest changes (if using git)
    if [ -d ".git" ]; then
        log "Pulling latest changes from git..."
        git pull origin main
    fi

    # Build the images
    log "Building Docker images..."
    docker-compose -f $COMPOSE_FILE build --no-cache

    # Stop existing containers gracefully
    log "Stopping existing containers..."
    docker-compose -f $COMPOSE_FILE down --timeout 30

    # Start new containers
    log "Starting new containers..."
    docker-compose -f $COMPOSE_FILE up -d

    # Wait for health checks
    log "Waiting for services to be healthy..."
    sleep 30

    # Check if services are healthy
    check_health
}

# Check service health
check_health() {
    log "Checking service health..."

    # Check backend health
    max_attempts=10
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost/admin/monitoring/health &>/dev/null; then
            log "Backend is healthy"
            break
        else
            warn "Backend not ready yet (attempt $attempt/$max_attempts)"
            sleep 10
            ((attempt++))
        fi
    done

    if [ $attempt -gt $max_attempts ]; then
        error "Backend failed to become healthy"
        exit 1
    fi

    # Check nginx
    if curl -f http://localhost/health &>/dev/null; then
        log "Nginx load balancer is healthy"
    else
        error "Nginx load balancer is not responding"
        exit 1
    fi
}

# Clean up old images and containers
cleanup() {
    log "Cleaning up old Docker resources..."

    # Remove unused containers
    docker container prune -f

    # Remove unused images
    docker image prune -f

    # Remove unused volumes (be careful with this)
    # docker volume prune -f

    log "Cleanup completed"
}

# Rollback function
rollback() {
    error "Deployment failed. Attempting rollback..."

    # Stop current deployment
    docker-compose -f $COMPOSE_FILE down

    # If you have a previous version, you could start it here
    # For now, we'll just log the issue
    error "Rollback completed. Manual intervention may be required."
}

# Main deployment process
main() {
    log "Starting deployment process..."

    check_docker
    create_backup

    if deploy; then
        log "✅ Deployment successful!"
        cleanup
        log "🎉 Application is now running with load balancing"
        log "   - Backend: http://localhost"
        log "   - Health Check: http://localhost/health"
        log "   - Admin Monitoring: http://localhost/admin/monitoring/health"
    else
        error "❌ Deployment failed!"
        rollback
        exit 1
    fi
}

# Run main function
main "$@"
