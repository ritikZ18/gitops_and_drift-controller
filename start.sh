#!/bin/bash

# GitOps Controller Lifecycle Script
# Usage: ./start.sh [--stop | --debug | --backend | --frontend | --all]

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKEND_PORT=8080
FRONTEND_PORT=3000

function log() {
    echo -e "${BLUE}[GITOPS]${NC} $1"
}

function error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

function success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

function warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

function stop_services() {
    log "Stopping services..."
    
    # Kill processes on specific ports
    for port in $BACKEND_PORT $FRONTEND_PORT; do
        PID=$(lsof -ti :$port)
        if [ ! -z "$PID" ]; then
            log "Killing process on port $port (PID: $PID)"
            kill -9 $PID 2>/dev/null
        fi
    done

    # Fallback for Next.js/Node processes that might not release port quickly
    pkill -f "next-dev" 2>/dev/null
    pkill -f "next" 2>/dev/null

    # Cleanup Next.js lock file specifically if it exists
    if [ -f "client/.next/dev/lock" ]; then
        log "Removing Next.js dev lock..."
        rm -f client/.next/dev/lock
    fi

    success "All services stopped."
}

function start_backend() {
    local debug=$1
    log "Starting backend on :$BACKEND_PORT..."
    
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null ; then
        error "Port $BACKEND_PORT is already in use. Run with --stop first."
        return 1
    fi

    cd server
    if [ "$debug" == "true" ]; then
        go run cmd/server/main.go &
    else
        go build -o server_bin cmd/server/main.go
        ./server_bin &
    fi
    BACKEND_PID=$!
    cd ..
    success "Backend started (PID: $BACKEND_PID)"
}

function start_frontend() {
    local debug=$1
    log "Starting frontend on :$FRONTEND_PORT..."
    
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null ; then
        error "Port $FRONTEND_PORT is already in use. Run with --stop first."
        return 1
    fi

    cd client
    if [ "$debug" == "true" ]; then
        npm run dev &
    else
        npm run build
        npm run start &
    fi
    FRONTEND_PID=$!
    cd ..
    success "Frontend started (PID: $FRONTEND_PID)"
}

# Handle Arguments
case "$1" in
    --stop)
        stop_services
        exit 0
        ;;
    --debug)
        DEBUG_MODE="true"
        ;;
    --backend)
        start_backend "true"
        wait
        exit 0
        ;;
    --frontend)
        start_frontend "true"
        wait
        exit 0
        ;;
    --all|*)
        DEBUG_MODE="true" # Default to debug for dev friendliness
        ;;
esac

# Start everything
log "Initializing GitOps Release & Drift Controller..."

# Trap Ctrl+C to stop services
trap stop_services SIGINT SIGTERM

start_backend $DEBUG_MODE
start_frontend $DEBUG_MODE

log "Both services are running. Press Ctrl+C to stop."
log "Backend: http://localhost:$BACKEND_PORT"
log "Frontend: http://localhost:$FRONTEND_PORT"

wait
