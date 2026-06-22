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
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
PRE_DEPLOY_COMMIT=""
PRE_DEPLOY_BRANCH=""

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
        PRE_DEPLOY_COMMIT=$(git rev-parse HEAD 2>/dev/null || true)
        PRE_DEPLOY_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)

        log "Pulling latest changes from git (branch: $DEPLOY_BRANCH)..."
        git fetch origin "$DEPLOY_BRANCH"
        git checkout "$DEPLOY_BRANCH"
        git pull origin "$DEPLOY_BRANCH"
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
    max_attempts=18
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:4000/health &>/dev/null; then
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
        return 1
    fi

    # Check nginx
    if curl -f http://localhost/health &>/dev/null; then
        log "Nginx load balancer is healthy"
    else
        error "Nginx load balancer is not responding"
        return 1
    fi

    return 0
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
    docker-compose -f $COMPOSE_FILE down || true

    # Restore previous git revision if available
    if [ -d ".git" ] && [ -n "$PRE_DEPLOY_COMMIT" ]; then
        warn "Reverting to previous commit: $PRE_DEPLOY_COMMIT"
        git checkout "$PRE_DEPLOY_COMMIT" || {
            error "Failed to checkout previous commit"
            return 1
        }

        warn "Rebuilding previous release"
        docker-compose -f $COMPOSE_FILE build --no-cache || {
            error "Rollback build failed"
            return 1
        }

        docker-compose -f $COMPOSE_FILE up -d || {
            error "Rollback start failed"
            return 1
        }

        sleep 20
        if check_health; then
            log "✅ Rollback successful. Service restored on previous commit."
            if [ -n "$PRE_DEPLOY_BRANCH" ] && [ "$PRE_DEPLOY_BRANCH" != "HEAD" ]; then
                git checkout "$PRE_DEPLOY_BRANCH" >/dev/null 2>&1 || true
            fi
            return 0
        fi

        error "Rollback health checks failed"
        return 1
    fi

    error "No previous git commit available for automatic rollback. Manual intervention required."
    return 1
}

# Print useful diagnostics for failed deployments
dump_diagnostics() {
    warn "Collecting Docker Compose diagnostics..."
    docker-compose -f $COMPOSE_FILE ps || true
    docker-compose -f $COMPOSE_FILE logs --tail=200 backend || true
    docker-compose -f $COMPOSE_FILE logs --tail=100 nginx || true
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
        log "   - Admin Monitoring: requires auth at /admin/monitoring/*"
    else
        error "❌ Deployment failed!"
        dump_diagnostics
        rollback
        exit 1
    fi
}

# Run main function
main "$@"
