#!/bin/bash

# Health check script for monitoring
set -e

# Configuration
HEALTH_URL="http://localhost:3000/health"
ALERT_EMAIL="admin@logogear.co.in"
LOG_FILE="/var/log/logogear-portal/health-check.log"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Function to send alert
send_alert() {
    local message="$1"
    log_message "ALERT: $message"
    # Send email alert (configure mail server)
    # echo "$message" | mail -s "Logogear Portal Alert" $ALERT_EMAIL
}

# Perform health check
log_message "Starting health check..."

# Check application health
response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL || echo "000")

if [ "$response" != "200" ]; then
    send_alert "Application health check failed. HTTP status: $response"
    
    # Try to restart the application
    log_message "Attempting to restart application..."
    docker-compose restart app
    
    # Wait and check again
    sleep 30
    response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL || echo "000")
    
    if [ "$response" != "200" ]; then
        send_alert "Application restart failed. Manual intervention required."
        exit 1
    else
        log_message "Application restarted successfully"
    fi
else
    log_message "Health check passed"
fi

# Check database connectivity
db_check=$(docker-compose exec -T db pg_isready -U logogear -d logogear_portal || echo "failed")
if [[ $db_check == *"failed"* ]]; then
    send_alert "Database connectivity check failed"
else
    log_message "Database connectivity check passed"
fi

# Check Redis connectivity
redis_check=$(docker-compose exec -T redis redis-cli ping || echo "failed")
if [ "$redis_check" != "PONG" ]; then
    send_alert "Redis connectivity check failed"
else
    log_message "Redis connectivity check passed"
fi

log_message "Health check completed"