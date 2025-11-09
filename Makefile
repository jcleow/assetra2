GOFMT_FILES=$(shell find . -type f -name '*.go' -not -path './node_modules/*')

.PHONY: run lint test fmt

run:
	go run ./cmd/server

lint:
	golangci-lint run ./...

fmt:
	gofmt -w $(GOFMT_FILES)

test:
	go test ./...
