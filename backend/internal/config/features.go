package config

import (
	"os"
	"strings"
)

type FeatureFlags map[string]bool

func LoadFeatureFlags() FeatureFlags {
	flags := FeatureFlags{}
	raw := os.Getenv("FEATURE_FLAGS")
	if raw == "" {
		return flags
	}
	for _, f := range strings.Split(raw, ",") {
		f = strings.TrimSpace(f)
		if f != "" {
			flags[f] = true
		}
	}
	return flags
}

func (ff FeatureFlags) IsEnabled(name string) bool {
	return ff[name]
}