#!/bin/bash
# =============================================================
#  radio - Webradio VPS Management Script
#  Usage: ./radio.sh <command>
#  Tip: symlink to /usr/local/bin/radio for global access:
#    sudo ln -sf /path/to/API_Musica/radio.sh /usr/local/bin/radio
# =============================================================

set -e

# ── Configuration ──────────────────────────────────────────────
SCRIPT_PATH="$(readlink -f "$0")"  # resolve symlink to actual file
API_DIR="$(dirname "$SCRIPT_PATH")"  # directory where the real script lives
DASH_DIR="/var/www/dashboard"
COMPOSE_FILE="docker-compose.prod.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

info()  { echo -e "${CYAN}▸${NC} $1"; }
success() { echo -e "${GREEN}✔${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✖${NC} $1"; }
header() { echo -e "\n${BOLD}${CYAN}━━━ $1 ━━━${NC}\n"; }

# ── Commands ───────────────────────────────────────────────────

cmd_up() {
    header "Starting all services"
    cd "$API_DIR"
    docker compose -f "$COMPOSE_FILE" up -d
    success "All services are up"
}

cmd_down() {
    header "Stopping all services"
    cd "$API_DIR"
    docker compose -f "$COMPOSE_FILE" down
    success "All services stopped"
}

cmd_restart() {
    local service="$1"
    if [ -n "$service" ]; then
        header "Restarting service: $service"
        cd "$API_DIR"
        docker compose -f "$COMPOSE_FILE" restart "$service"
        success "$service restarted"
    else
        header "Restarting all services"
        cd "$API_DIR"
        docker compose -f "$COMPOSE_FILE" restart
        success "All services restarted"
    fi
}

cmd_rebuild() {
    local service="$1"
    if [ -n "$service" ]; then
        header "Rebuilding service: $service"
        cd "$API_DIR"
        docker compose -f "$COMPOSE_FILE" build --no-cache "$service"
        docker compose -f "$COMPOSE_FILE" up -d "$service"
        success "$service rebuilt and started"
    else
        header "Rebuilding all services"
        cd "$API_DIR"
        docker compose -f "$COMPOSE_FILE" build --no-cache
        docker compose -f "$COMPOSE_FILE" up -d
        success "All services rebuilt and started"
    fi
}

cmd_logs() {
    local service="$1"
    local lines="${2:-100}"
    cd "$API_DIR"
    if [ -n "$service" ]; then
        docker compose -f "$COMPOSE_FILE" logs -f --tail="$lines" "$service"
    else
        docker compose -f "$COMPOSE_FILE" logs -f --tail="$lines"
    fi
}

cmd_status() {
    header "Service Status"
    cd "$API_DIR"
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    
    # Show resource usage
    info "Resource usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
        $(docker compose -f "$COMPOSE_FILE" ps -q 2>/dev/null) 2>/dev/null || true
}

cmd_dash() {
    header "Building Dashboard"
    if [ ! -d "$DASH_DIR" ]; then
        error "Dashboard directory not found: $DASH_DIR"
        exit 1
    fi
    cd "$DASH_DIR"
    info "Installing dependencies..."
    npm ci --silent 2>/dev/null || npm install --silent
    info "Building..."
    npm run build
    success "Dashboard built successfully"
}

cmd_deploy() {
    header "Full Deploy"
    
    info "1/3 Pulling latest code..."
    cd "$API_DIR"
    git pull 2>/dev/null && success "Code updated" || warn "Git pull skipped (not a repo or no remote)"
    
    info "2/3 Rebuilding API services..."
    docker compose -f "$COMPOSE_FILE" build --no-cache
    docker compose -f "$COMPOSE_FILE" up -d
    success "API services deployed"
    
    info "3/3 Building dashboard..."
    cmd_dash
    
    echo ""
    success "Full deploy complete! 🚀"
    cmd_status
}

cmd_pull() {
    header "Pulling latest code"
    cd "$API_DIR"
    git pull
    success "Code updated"
}

cmd_cache_clear() {
    header "Clearing Redis cache"
    cd "$API_DIR"
    docker compose -f "$COMPOSE_FILE" exec redis redis-cli FLUSHALL
    success "Redis cache cleared"
}

cmd_db() {
    header "Database shell (SQLite)"
    cd "$API_DIR"
    docker compose -f "$COMPOSE_FILE" exec webradio sqlite3 /app/data/webradio.db
}

cmd_shell() {
    local service="${1:-webradio}"
    header "Shell into $service"
    cd "$API_DIR"
    docker compose -f "$COMPOSE_FILE" exec "$service" sh
}

cmd_help() {
    echo -e "${BOLD}${CYAN}"
    echo "  ╔══════════════════════════════════════════════╗"
    echo "  ║           🎵  Webradio Manager  🎵           ║"
    echo "  ╚══════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${BOLD}Usage:${NC} radio <command> [options]"
    echo ""
    echo -e "  ${BOLD}${GREEN}Services${NC}"
    echo -e "    ${CYAN}up${NC}                    Start all services"
    echo -e "    ${CYAN}down${NC}                  Stop all services"
    echo -e "    ${CYAN}restart${NC} [service]     Restart all or one service"
    echo -e "    ${CYAN}rebuild${NC} [service]     Rebuild and restart (no cache)"
    echo -e "    ${CYAN}status${NC}                Show service status + resource usage"
    echo ""
    echo -e "  ${BOLD}${GREEN}Logs${NC}"
    echo -e "    ${CYAN}logs${NC} [service] [N]    Follow logs (last N lines, default 100)"
    echo ""
    echo -e "  ${BOLD}${GREEN}Dashboard${NC}"
    echo -e "    ${CYAN}dash${NC}                  Build dashboard (npm run build)"
    echo ""
    echo -e "  ${BOLD}${GREEN}Deploy${NC}"
    echo -e "    ${CYAN}deploy${NC}                Full deploy: pull + rebuild + dash"
    echo -e "    ${CYAN}pull${NC}                  Git pull latest code"
    echo ""
    echo -e "  ${BOLD}${GREEN}Utilities${NC}"
    echo -e "    ${CYAN}cache-clear${NC}           Flush Redis cache"
    echo -e "    ${CYAN}db${NC}                    Open SQLite shell"
    echo -e "    ${CYAN}shell${NC} [service]       Open shell in container (default: webradio)"
    echo ""
    echo -e "  ${BOLD}Services:${NC} webradio, webradio-deezer-service, redis"
    echo ""
    echo -e "  ${BOLD}Examples:${NC}"
    echo -e "    radio rebuild webradio      # Rebuild only the API"
    echo -e "    radio logs webradio 50      # Last 50 lines of API logs"
    echo -e "    radio restart               # Restart everything"
    echo -e "    radio deploy                # Full redeploy"
    echo ""
}

# ── Main ───────────────────────────────────────────────────────

case "${1:-help}" in
    up)           cmd_up ;;
    down)         cmd_down ;;
    restart)      cmd_restart "$2" ;;
    rebuild)      cmd_rebuild "$2" ;;
    logs)         cmd_logs "$2" "$3" ;;
    status|ps)    cmd_status ;;
    dash)         cmd_dash ;;
    deploy)       cmd_deploy ;;
    pull)         cmd_pull ;;
    cache-clear)  cmd_cache_clear ;;
    db)           cmd_db ;;
    shell|sh)     cmd_shell "$2" ;;
    help|--help|-h) cmd_help ;;
    *)
        error "Unknown command: $1"
        cmd_help
        exit 1
        ;;
esac
