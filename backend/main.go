package main

import (
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

var allowedHosts = map[string]struct{}{
	"by-a-thread.de":     {},
	"www.by-a-thread.de": {},
	"localhost":          {},
	"127.0.0.1":          {},
}

func main() {
	siteDir, err := resolveSiteDir()
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()

	siteFS := http.FileServer(http.Dir(siteDir))
	mux.Handle("GET /{$}", siteFS)
	mux.Handle("GET /{path...}", siteFS)

	server := &http.Server{
		Addr:              ":8080",
		Handler:           hostAllowlistMiddleware(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("serving site from %q on http://localhost%s", siteDir, server.Addr)

	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

func hostAllowlistMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host := hostWithoutPort(r.Host)
		if _, ok := allowedHosts[host]; !ok {
			http.Error(w, "host not allowed", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func hostWithoutPort(hostport string) string {
	host, _, err := net.SplitHostPort(hostport)
	if err != nil {
		return hostport
	}

	return host
}

func resolveSiteDir() (string, error) {
	candidates := []string{
		"frontend",
		filepath.Join("..", "frontend"),
	}

	for _, candidate := range candidates {
		info, err := os.Stat(candidate)
		if err != nil || !info.IsDir() {
			continue
		}

		return candidate, nil
	}

	return "", errors.New("could not find site directory: expected ./frontend")
}
