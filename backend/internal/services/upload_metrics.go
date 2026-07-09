package services

import "sync/atomic"

// Upload metrics counters (lightweight observability).
var (
	uploadSessionsInit     atomic.Uint64
	uploadSessionsComplete atomic.Uint64
	uploadSessionsAbort    atomic.Uint64
	uploadPartsFailed      atomic.Uint64
)

func RecordUploadInit()     { uploadSessionsInit.Add(1) }
func RecordUploadComplete() { uploadSessionsComplete.Add(1) }
func RecordUploadAbort()    { uploadSessionsAbort.Add(1) }
func RecordUploadPartFailed() { uploadPartsFailed.Add(1) }

// UploadMetricsSnapshot returns current counters for health/debug endpoints.
func UploadMetricsSnapshot() map[string]uint64 {
	return map[string]uint64{
		"sessions_init":     uploadSessionsInit.Load(),
		"sessions_complete": uploadSessionsComplete.Load(),
		"sessions_abort":    uploadSessionsAbort.Load(),
		"parts_failed":      uploadPartsFailed.Load(),
	}
}
