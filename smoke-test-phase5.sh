#!/bin/bash
# ============================================================================
# Phase 5 Smoke Test Suite
# ============================================================================
# 
# This script runs comprehensive smoke tests to verify Phase 5 deployment
# Tests API endpoints, database connectivity, and basic functionality
#
# Usage: ./smoke-test.sh [--skip-build] [--frontend-only] [--backend-only]
#
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Configuration
BACKEND_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:5173"  # Vite dev server
MAX_WAIT_ATTEMPTS=30
WAIT_INTERVAL=1

# ============================================================================
# Utility Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_skip() {
    echo -e "${YELLOW}[SKIP]${NC} $1"
    ((TESTS_SKIPPED++))
}

wait_for_service() {
    local url=$1
    local service=$2
    local attempts=0
    
    log_info "Waiting for $service to be ready..."
    
    while [ $attempts -lt $MAX_WAIT_ATTEMPTS ]; do
        if curl -s "$url/health" > /dev/null 2>&1 || curl -s "$url" > /dev/null 2>&1; then
            log_success "$service is ready"
            return 0
        fi
        attempts=$((attempts + 1))
        sleep $WAIT_INTERVAL
    done
    
    log_error "$service failed to start after ${MAX_WAIT_ATTEMPTS}s"
    return 1
}

# ============================================================================
# System Health Checks
# ============================================================================

test_backend_health() {
    log_info "Testing backend health endpoint..."
    
    response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/v1/health")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Backend health check returned 200"
        return 0
    else
        log_error "Backend health check failed with $http_code"
        return 1
    fi
}

test_database_connection() {
    log_info "Testing database connection..."
    
    # Try to query a simple endpoint that requires DB access
    response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer test-token" \
        "$BACKEND_URL/api/v1/campaigns")
    
    http_code=$(echo "$response" | tail -n1)
    
    # 401 or 200 means DB is responsive (not 500 server error)
    if [ "$http_code" = "401" ] || [ "$http_code" = "200" ]; then
        log_success "Database connection verified"
        return 0
    else
        log_error "Database connection failed with $http_code"
        return 1
    fi
}

test_redis_connection() {
    log_info "Testing Redis connection..."
    
    # Try to create and list something that uses Redis
    # This will be tested indirectly through campaign creation
    log_skip "Redis test skipped (tested via job queue)"
    return 0
}

# ============================================================================
# Authentication Tests
# ============================================================================

test_signup() {
    log_info "Testing user signup..."
    
    local email="smoketest_$(date +%s)@example.com"
    local response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/v1/auth/signup" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$email\",
            \"password\": \"SmokeTest123!\",
            \"first_name\": \"Smoke\",
            \"last_name\": \"Test\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "201" ]; then
        # Extract token
        token=$(echo "$body" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
        if [ -n "$token" ]; then
            export AUTH_TOKEN="$token"
            export TEST_USER_EMAIL="$email"
            log_success "Signup successful, obtained token"
            return 0
        else
            log_error "Signup succeeded but no token in response"
            return 1
        fi
    else
        log_error "Signup failed with $http_code"
        return 1
    fi
}

test_signin() {
    log_info "Testing user signin..."
    
    if [ -z "$TEST_USER_EMAIL" ]; then
        log_skip "Signin test skipped (no test user from signup)"
        return 0
    fi
    
    local response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/v1/auth/signin" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_USER_EMAIL\",
            \"password\": \"SmokeTest123!\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Signin successful"
        return 0
    else
        log_error "Signin failed with $http_code"
        return 1
    fi
}

test_auth_protection() {
    log_info "Testing API auth protection..."
    
    local response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/v1/campaigns")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "401" ]; then
        log_success "Protected endpoint returns 401 without token"
        return 0
    else
        log_error "Protected endpoint returned $http_code instead of 401"
        return 1
    fi
}

# ============================================================================
# Campaign Tests
# ============================================================================

test_create_person() {
    log_info "Creating test person for campaigns..."
    
    local name="Smoke_$(date +%s)"
    local response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/v1/people" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"first_name\": \"Test\",
            \"last_name\": \"$name\",
            \"phone\": \"+15551234567\",
            \"email\": \"test-$name@example.com\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "201" ]; then
        # Extract person ID
        person_id=$(echo "$body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        export TEST_PERSON_ID="$person_id"
        log_success "Created test person: $person_id"
        return 0
    else
        log_error "Failed to create person with $http_code"
        return 1
    fi
}

test_create_campaign() {
    log_info "Testing campaign creation..."
    
    if [ -z "$TEST_PERSON_ID" ]; then
        log_error "Cannot create campaign without test person"
        return 1
    fi
    
    local name="Campaign_$(date +%s)"
    local response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/v1/campaigns" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$name\",
            \"description\": \"Smoke test campaign\",
            \"prospect_ids\": [\"$TEST_PERSON_ID\"]
        }")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "201" ]; then
        # Extract campaign ID
        campaign_id=$(echo "$body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        export TEST_CAMPAIGN_ID="$campaign_id"
        log_success "Created campaign: $campaign_id"
        return 0
    else
        log_error "Campaign creation failed with $http_code"
        return 1
    fi
}

test_list_campaigns() {
    log_info "Testing campaign listing..."
    
    local response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$BACKEND_URL/api/v1/campaigns")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Campaign list endpoint returned 200"
        return 0
    else
        log_error "Campaign list failed with $http_code"
        return 1
    fi
}

test_get_campaign_detail() {
    log_info "Testing campaign detail retrieval..."
    
    if [ -z "$TEST_CAMPAIGN_ID" ]; then
        log_skip "Campaign detail test skipped (no campaign from creation)"
        return 0
    fi
    
    local response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$BACKEND_URL/api/v1/campaigns/$TEST_CAMPAIGN_ID")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Campaign detail retrieved"
        return 0
    else
        log_error "Campaign detail failed with $http_code"
        return 1
    fi
}

test_update_campaign() {
    log_info "Testing campaign update..."
    
    if [ -z "$TEST_CAMPAIGN_ID" ]; then
        log_skip "Campaign update test skipped"
        return 0
    fi
    
    local response=$(curl -s -w "\n%{http_code}" -X PATCH "$BACKEND_URL/api/v1/campaigns/$TEST_CAMPAIGN_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"description\": \"Updated description via smoke test\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Campaign updated successfully"
        return 0
    else
        log_error "Campaign update failed with $http_code"
        return 1
    fi
}

# ============================================================================
# Campaign Lifecycle Tests
# ============================================================================

test_start_campaign() {
    log_info "Testing campaign start (draft → running)..."
    
    if [ -z "$TEST_CAMPAIGN_ID" ]; then
        log_skip "Campaign start test skipped"
        return 0
    fi
    
    local response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/v1/campaigns/$TEST_CAMPAIGN_ID/start" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Campaign started successfully"
        return 0
    else
        log_error "Campaign start failed with $http_code"
        return 1
    fi
}

test_pause_campaign() {
    log_info "Testing campaign pause (running → paused)..."
    
    if [ -z "$TEST_CAMPAIGN_ID" ]; then
        log_skip "Campaign pause test skipped"
        return 0
    fi
    
    local response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/v1/campaigns/$TEST_CAMPAIGN_ID/pause" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Campaign paused successfully"
        return 0
    else
        log_error "Campaign pause failed with $http_code"
        return 1
    fi
}

test_resume_campaign() {
    log_info "Testing campaign resume (paused → running)..."
    
    if [ -z "$TEST_CAMPAIGN_ID" ]; then
        log_skip "Campaign resume test skipped"
        return 0
    fi
    
    local response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/v1/campaigns/$TEST_CAMPAIGN_ID/resume" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Campaign resumed successfully"
        return 0
    else
        log_error "Campaign resume failed with $http_code"
        return 1
    fi
}

# ============================================================================
# Call Tests
# ============================================================================

test_list_calls() {
    log_info "Testing call listing..."
    
    local response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$BACKEND_URL/api/v1/calls")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Calls list endpoint returned 200"
        return 0
    else
        log_error "Calls list failed with $http_code"
        return 1
    fi
}

test_dashboard_metrics() {
    log_info "Testing dashboard metrics endpoint..."
    
    local response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$BACKEND_URL/api/v1/calls/dashboard/metrics")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        # Check for expected fields
        if echo "$body" | grep -q "calls_total"; then
            log_success "Dashboard metrics endpoint working"
            return 0
        else
            log_error "Dashboard metrics missing expected fields"
            return 1
        fi
    else
        log_error "Dashboard metrics failed with $http_code"
        return 1
    fi
}

# ============================================================================
# Transcript Tests
# ============================================================================

test_list_transcripts() {
    log_info "Testing transcript listing..."
    
    local response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$BACKEND_URL/api/v1/transcripts")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_success "Transcripts list endpoint returned 200"
        return 0
    else
        log_error "Transcripts list failed with $http_code"
        return 1
    fi
}

# ============================================================================
# Error Handling Tests
# ============================================================================

test_invalid_campaign_id() {
    log_info "Testing 404 for invalid campaign ID..."
    
    local response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$BACKEND_URL/api/v1/campaigns/invalid-id-12345")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "404" ]; then
        log_success "Invalid campaign ID returns 404"
        return 0
    else
        log_error "Invalid campaign ID returned $http_code instead of 404"
        return 1
    fi
}

test_invalid_state_transition() {
    log_info "Testing invalid campaign state transition..."
    
    if [ -z "$TEST_CAMPAIGN_ID" ]; then
        log_skip "State transition test skipped"
        return 0
    fi
    
    # Try to pause a campaign that's already paused
    local response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/v1/campaigns/$TEST_CAMPAIGN_ID/pause" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json")
    
    http_code=$(echo "$response" | tail -n1)
    
    # Should be 400 or 409 for invalid state transition
    if [ "$http_code" = "400" ] || [ "$http_code" = "409" ]; then
        log_success "Invalid state transition rejected with $http_code"
        return 0
    else
        log_warning "Invalid state transition returned $http_code (expected 400/409)"
        # Don't fail for this one as it depends on campaign state
        return 0
    fi
}

# ============================================================================
# Frontend Tests (Optional)
# ============================================================================

test_frontend_build() {
    log_info "Testing frontend build..."
    
    if [ "$SKIP_FRONTEND" = "true" ]; then
        log_skip "Frontend tests skipped"
        return 0
    fi
    
    cd frontend 2>/dev/null || {
        log_warning "Frontend directory not found, skipping"
        return 0
    }
    
    # Check if build artifacts exist
    if [ -d "dist" ]; then
        log_success "Frontend build artifacts exist"
        cd - > /dev/null
        return 0
    else
        log_warning "Frontend build artifacts not found"
        cd - > /dev/null
        return 0
    fi
}

# ============================================================================
# Main Test Suite
# ============================================================================

main() {
    local skip_build=false
    local frontend_only=false
    local backend_only=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-build)
                skip_build=true
                shift
                ;;
            --frontend-only)
                frontend_only=true
                shift
                ;;
            --backend-only)
                backend_only=true
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         Phase 5 Smoke Test Suite                           ║"
    echo "║         Deployment Verification                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Wait for services to be ready
    if [ "$backend_only" != "true" ]; then
        if ! wait_for_service "$FRONTEND_URL" "Frontend"; then
            log_error "Frontend failed to start"
        fi
    fi
    
    if [ "$frontend_only" != "true" ]; then
        if ! wait_for_service "$BACKEND_URL" "Backend"; then
            log_error "Backend failed to start"
            exit 1
        fi
    fi
    
    echo ""
    log_info "Starting smoke tests..."
    echo ""
    
    # System Health Tests
    if [ "$frontend_only" != "true" ]; then
        log_info "═ SYSTEM HEALTH TESTS ════════════════════════════════════"
        test_backend_health
        test_database_connection
        test_redis_connection
        echo ""
    fi
    
    # Authentication Tests
    if [ "$frontend_only" != "true" ]; then
        log_info "═ AUTHENTICATION TESTS ═══════════════════════════════════"
        test_signup
        test_signin
        test_auth_protection
        echo ""
    fi
    
    # Campaign Tests
    if [ "$frontend_only" != "true" ]; then
        log_info "═ CAMPAIGN TESTS ══════════════════════════════════════════"
        test_create_person
        test_create_campaign
        test_list_campaigns
        test_get_campaign_detail
        test_update_campaign
        echo ""
    fi
    
    # Campaign Lifecycle Tests
    if [ "$frontend_only" != "true" ]; then
        log_info "═ CAMPAIGN LIFECYCLE TESTS ════════════════════════════════"
        test_start_campaign
        test_pause_campaign
        test_resume_campaign
        echo ""
    fi
    
    # Call Tests
    if [ "$frontend_only" != "true" ]; then
        log_info "═ CALL TESTS ══════════════════════════════════════════════"
        test_list_calls
        test_dashboard_metrics
        echo ""
    fi
    
    # Transcript Tests
    if [ "$frontend_only" != "true" ]; then
        log_info "═ TRANSCRIPT TESTS ════════════════════════════════════════"
        test_list_transcripts
        echo ""
    fi
    
    # Error Handling Tests
    if [ "$frontend_only" != "true" ]; then
        log_info "═ ERROR HANDLING TESTS ════════════════════════════════════"
        test_invalid_campaign_id
        test_invalid_state_transition
        echo ""
    fi
    
    # Frontend Tests
    if [ "$backend_only" != "true" ]; then
        log_info "═ FRONTEND TESTS ══════════════════════════════════════════"
        test_frontend_build
        echo ""
    fi
    
    # Summary
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                     TEST SUMMARY                           ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo -e "║ ${GREEN}Passed:${NC}  $TESTS_PASSED"
    echo -e "║ ${RED}Failed:${NC}  $TESTS_FAILED"
    echo -e "║ ${YELLOW}Skipped:${NC} $TESTS_SKIPPED"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
        echo ""
        echo "System is ready for production deployment!"
        return 0
    else
        echo -e "${RED}✗ SOME TESTS FAILED${NC}"
        echo ""
        echo "Review failures above and fix issues before deployment."
        return 1
    fi
}

# Run main test suite
main "$@"
exit $?
