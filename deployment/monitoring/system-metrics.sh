#!/bin/bash

# System metrics collection script
set -e

# Configuration
METRICS_FILE="/var/log/logogear-portal/metrics.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log metrics
log_metric() {
    echo "[$TIMESTAMP] $1" >> $METRICS_FILE
}

# Collect system metrics
echo "Collecting system metrics at $TIMESTAMP"

# CPU usage
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
log_metric "CPU_USAGE: ${cpu_usage}%"

# Memory usage
memory_info=$(free -m | grep '^Mem:')
total_mem=$(echo $memory_info | awk '{print $2}')
used_mem=$(echo $memory_info | awk '{print $3}')
memory_percent=$(( (used_mem * 100) / total_mem ))
log_metric "MEMORY_USAGE: ${memory_percent}% (${used_mem}MB/${total_mem}MB)"

# Disk usage
disk_usage=$(df -h / | awk 'NR==2 {print $5}' | cut -d'%' -f1)
log_metric "DISK_USAGE: ${disk_usage}%"

# Docker container stats
if command -v docker &> /dev/null; then
    # Application container stats
    app_stats=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep logogear)
    if [ ! -z "$app_stats" ]; then
        log_metric "DOCKER_STATS: $app_stats"
    fi
fi

# Database connections
db_connections=$(docker-compose exec -T db psql -U logogear -d logogear_portal -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || echo "0")
log_metric "DB_CONNECTIONS: $db_connections"

# Application logs error count (last hour)
error_count=$(grep -c "ERROR" /var/log/logogear-portal/app.log | tail -1 || echo "0")
log_metric "ERROR_COUNT_LAST_HOUR: $error_count"

echo "Metrics collection completed"