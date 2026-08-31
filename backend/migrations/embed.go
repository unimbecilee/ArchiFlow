package migrations

import (
	"embed"
)

//go:embed *.sql
var embedded embed.FS

func All() embed.FS {
	return embedded
}
