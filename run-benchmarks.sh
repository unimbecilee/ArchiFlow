#!/bin/bash
# k6 benchmark runner
# Usage: ./run-benchmarks.sh [test_name]

set -e

API_URL=${API_URL:-http://localhost:5010}
RESULTS_DIR="k6-results/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

run_test() {
    local test_name=$1
    local script=$2
    echo "Running $test_name..."
    k6 run \
        --env API_URL="${API_URL}" \
        --out json="${RESULTS_DIR}/${test_name}.json" \
        --summary-export="${RESULTS_DIR}/${test_name}-summary.json" \
        "k6/${script}"
}

case "${1:-all}" in
    login)
        run_test "login" "login.js"
        ;;
    documents)
        run_test "documents_list" "documents_list.js"
        ;;
    search)
        run_test "search" "search.js"
        ;;
    ws)
        run_test "websocket" "websocket.js"
        ;;
    upload)
        run_test "upload" "upload.js"
        ;;
    spike)
        run_test "spike" "spike.js"
        ;;
    all)
        run_test "login" "login.js"
        run_test "documents_list" "documents_list.js"
        run_test "search" "search.js"
        run_test "websocket" "websocket.js"
        run_test "upload" "upload.js"
        run_test "spike" "spike.js"
        ;;
    *)
        echo "Usage: $0 [login|documents|search|ws|upload|spike|all]"
        exit 1
        ;;
esac

echo "Results saved to $RESULTS_DIR"
echo "Generating report..."
cat > "${RESULTS_DIR}/report.md" << EOF
# k6 Benchmark Report

**Date:** $(date)
**API URL:** ${API_URL}
**Environment:** $(uname -s)

## Results Summary

| Test | Avg Latency (ms) | P95 Latency (ms) | Max Latency (ms) | Error Rate | Throughput (req/s) |
|------|------------------|------------------|------------------|------------|-------------------|
EOF

for f in "${RESULTS_DIR}"/*-summary.json; do
    if [ -f "$f" ]; then
        test_name=$(basename "$f" -summary.json)
        avg=$(jq -r '.metrics.http_req_duration.values.avg' "$f")
        p95=$(jq -r '.metrics.http_req_duration.values["p(95)"]' "$f")
        max=$(jq -r '.metrics.http_req_duration.values.max' "$f")
        error_rate=$(jq -r '.metrics.http_req_failed.values.rate' "$f")
        throughput=$(jq -r '.metrics.http_reqs.values.rate' "$f")
        echo "| $test_name | $avg | $p95 | $max | $error_rate | $throughput |" >> "${RESULTS_DIR}/report.md"
    fi
done

echo "" >> "${RESULTS_DIR}/report.md"
echo "Full JSON results available in ${RESULTS_DIR}/" >> "${RESULTS_DIR}/report.md"