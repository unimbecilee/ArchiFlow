package jobqueue

import (
	"context"
	"log"
	"strings"

	"archiflow/backend/internal/models"
)

// EnqueueAfterUpload queues antivirus, OCR (PDF/images) and search index.
// Safe if the queue client is not initialized.
func EnqueueAfterUpload(ctx context.Context, doc *models.Document) {
	if doc == nil || doc.ID == 0 {
		return
	}
	av, err := NewAntivirusScanTask(AntivirusScanPayload{
		DocumentID: doc.ID,
		ObjectName: doc.MinioObjectName,
		Bucket:     doc.MinioBucket,
	})
	if err == nil {
		if _, err := Enqueue(ctx, av); err != nil && err != ErrNoClient {
			log.Printf("enqueue antivirus: %v", err)
		}
	}

	if needsOCR(doc.MimeType, doc.FileName) {
		ocr, err := NewOCRProcessTask(OCRProcessPayload{
			DocumentID: doc.ID,
			ObjectName: doc.MinioObjectName,
			Bucket:     doc.MinioBucket,
			Language:   "fra+eng",
		})
		if err == nil {
			if _, err := Enqueue(ctx, ocr); err != nil && err != ErrNoClient {
				log.Printf("enqueue ocr: %v", err)
			}
		}
	}

	idx, err := NewSearchIndexTask(SearchIndexPayload{DocumentID: doc.ID})
	if err == nil {
		if _, err := Enqueue(ctx, idx); err != nil && err != ErrNoClient {
			log.Printf("enqueue search index: %v", err)
		}
	}
}

func EnqueueSearchDelete(ctx context.Context, documentID uint) {
	t, err := NewSearchDeleteTask(SearchIndexPayload{DocumentID: documentID})
	if err != nil {
		return
	}
	if _, err := Enqueue(ctx, t); err != nil && err != ErrNoClient {
		log.Printf("enqueue search delete: %v", err)
	}
}

func needsOCR(mime, filename string) bool {
	m := strings.ToLower(mime)
	f := strings.ToLower(filename)
	if strings.Contains(m, "pdf") || strings.HasSuffix(f, ".pdf") {
		return true
	}
	if strings.HasPrefix(m, "image/") {
		return true
	}
	return strings.HasSuffix(f, ".png") || strings.HasSuffix(f, ".jpg") || strings.HasSuffix(f, ".jpeg") || strings.HasSuffix(f, ".tif") || strings.HasSuffix(f, ".tiff")
}
