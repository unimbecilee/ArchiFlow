package services

import (
	"testing"

	"archiflow/backend/internal/models"
)

func TestDefaultSftpForRole(t *testing.T) {
	cases := []struct {
		role    string
		enabled bool
		mode    string
	}{
		{models.RoleUser, true, models.SftpModeDrop},
		{models.RoleManager, true, models.SftpModeDrop},
		{models.RoleValidator, false, models.SftpModeNone},
		{models.RoleArchivist, false, models.SftpModeNone},
		{models.RoleAdmin, false, models.SftpModeNone},
		{"", false, models.SftpModeNone},
	}
	for _, tc := range cases {
		en, mode := models.DefaultSftpForRole(tc.role)
		if en != tc.enabled || mode != tc.mode {
			t.Fatalf("%s: got (%v,%s) want (%v,%s)", tc.role, en, mode, tc.enabled, tc.mode)
		}
	}
}

func TestNormalizeSftpMode(t *testing.T) {
	if models.NormalizeSftpMode("DROP") != models.SftpModeDrop {
		t.Fatal("DROP")
	}
	if models.NormalizeSftpMode("inbox") != models.SftpModeInbox {
		t.Fatal("inbox")
	}
	if models.NormalizeSftpMode("full") != models.SftpModeFull {
		t.Fatal("full")
	}
	if models.NormalizeSftpMode("weird") != models.SftpModeNone {
		t.Fatal("unknown → none")
	}
	if models.NormalizeSftpMode("") != models.SftpModeNone {
		t.Fatal("empty → none")
	}
}

func TestSftpPermissionsForMode(t *testing.T) {
	if p := sftpPermissionsForMode(models.SftpModeNone); p != nil {
		t.Fatal("none → nil perms")
	}
	drop := sftpPermissionsForMode(models.SftpModeDrop)
	if len(drop["/"]) != 2 {
		t.Fatalf("drop perms: %#v", drop)
	}
	inbox := sftpPermissionsForMode(models.SftpModeInbox)
	joined := stringsJoin(inbox["/"])
	if !containsAll(inbox["/"], "list", "upload", "download") {
		t.Fatalf("inbox: %s", joined)
	}
	full := sftpPermissionsForMode(models.SftpModeFull)
	if !containsAll(full["/"], "list", "download", "upload", "create_dirs") {
		t.Fatalf("full: %#v", full)
	}
}

func TestHumanMayUseSftp(t *testing.T) {
	u := &models.User{Role: models.RoleUser, IsActive: true, SftpEnabled: true, SftpMode: models.SftpModeDrop}
	ok, mode := humanSftpAccess(u)
	if !ok || mode != models.SftpModeDrop {
		t.Fatalf("user enabled drop: %v %s", ok, mode)
	}

	u.SftpEnabled = false
	ok, _ = humanSftpAccess(u)
	if ok {
		t.Fatal("disabled must deny")
	}

	admin := &models.User{Role: models.RoleAdmin, IsActive: true, SftpEnabled: false, SftpMode: models.SftpModeNone}
	ok, _ = humanSftpAccess(admin)
	if ok {
		t.Fatal("admin default deny")
	}

	admin.SftpEnabled = true
	admin.SftpMode = models.SftpModeInbox
	ok, mode = humanSftpAccess(admin)
	if !ok || mode != models.SftpModeInbox {
		t.Fatal("admin explicit opt-in")
	}

	arch := &models.User{Role: models.RoleArchivist, IsActive: true, SftpEnabled: true, SftpMode: models.SftpModeDrop}
	ok, mode = humanSftpAccess(arch)
	if !ok || mode != models.SftpModeDrop {
		t.Fatal("archivist can opt-in explicitly")
	}

	inactive := &models.User{Role: models.RoleUser, IsActive: false, SftpEnabled: true, SftpMode: models.SftpModeDrop}
	ok, _ = humanSftpAccess(inactive)
	if ok {
		t.Fatal("inactive deny")
	}

	// Legacy empty mode + enabled → fall back to role default mode when enabled
	legacy := &models.User{Role: models.RoleUser, IsActive: true, SftpEnabled: true, SftpMode: ""}
	ok, mode = humanSftpAccess(legacy)
	if !ok || mode != models.SftpModeDrop {
		t.Fatalf("legacy empty mode: %v %s", ok, mode)
	}
}

func TestServiceAccountSftpMode(t *testing.T) {
	if m := serviceAccountSftpMode(&models.ServiceAccount{SftpMode: ""}); m != models.SftpModeDrop {
		t.Fatalf("SA default drop, got %s", m)
	}
	if m := serviceAccountSftpMode(&models.ServiceAccount{SftpMode: "full"}); m != models.SftpModeFull {
		t.Fatalf("SA full, got %s", m)
	}
	if m := serviceAccountSftpMode(&models.ServiceAccount{SftpMode: "inbox"}); m != models.SftpModeDrop {
		t.Fatalf("SA inbox not allowed → drop, got %s", m)
	}
}

func stringsJoin(xs []string) string {
	out := ""
	for i, x := range xs {
		if i > 0 {
			out += ","
		}
		out += x
	}
	return out
}

func containsAll(have []string, need ...string) bool {
	set := map[string]bool{}
	for _, h := range have {
		set[h] = true
	}
	for _, n := range need {
		if !set[n] {
			return false
		}
	}
	return true
}
