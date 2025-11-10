package events

import (
	"context"
	"testing"
	"time"
)

func TestHubPublishesEventsToSubscribers(t *testing.T) {
	hub := NewHub(WithDebounceWindow(0))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	stream, err := hub.Subscribe(ctx, "")
	if err != nil {
		t.Fatalf("subscribe returned error: %v", err)
	}

	hub.Publish(StreamEvent{
		Entity:     "asset",
		Action:     "update",
		ResourceID: "asset-1",
		Data:       map[string]any{"value": 42},
	})

	select {
	case evt := <-stream:
		if evt.Entity != "asset" || evt.Action != "update" {
			t.Fatalf("unexpected event %#v", evt)
		}
		if evt.Cursor == "" || evt.ID == 0 {
			t.Fatalf("expected cursor/id to be set: %#v", evt)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for event")
	}
}

func TestHubReplaysHistoryFromCursor(t *testing.T) {
	hub := NewHub(WithDebounceWindow(0))

	ctx1, cancel1 := context.WithCancel(context.Background())
	stream1, err := hub.Subscribe(ctx1, "")
	if err != nil {
		t.Fatalf("subscribe returned error: %v", err)
	}

	hub.Publish(StreamEvent{
		Entity:     "asset",
		Action:     "update",
		ResourceID: "asset-2",
	})

	var first StreamEvent
	select {
	case evt := <-stream1:
		first = evt
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for first event")
	}
	cancel1()

	hub.Publish(StreamEvent{
		Entity:     "asset",
		Action:     "update",
		ResourceID: "asset-3",
	})

	ctx2, cancel2 := context.WithCancel(context.Background())
	defer cancel2()

	stream2, err := hub.Subscribe(ctx2, first.Cursor)
	if err != nil {
		t.Fatalf("subscribe returned error: %v", err)
	}

	select {
	case evt := <-stream2:
		if evt.ResourceID != "asset-3" {
			t.Fatalf("expected replayed event after cursor, got %#v", evt)
		}
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for replayed event")
	}
}

func TestHubDebouncesDuplicateKeys(t *testing.T) {
	window := 50 * time.Millisecond
	hub := NewHub(WithDebounceWindow(window))

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	stream, err := hub.Subscribe(ctx, "")
	if err != nil {
		t.Fatalf("subscribe returned error: %v", err)
	}

	hub.Publish(StreamEvent{
		Entity:     "asset",
		Action:     "update",
		ResourceID: "asset-4",
		Data:       map[string]any{"value": 1},
	})
	hub.Publish(StreamEvent{
		Entity:     "asset",
		Action:     "update",
		ResourceID: "asset-4",
		Data:       map[string]any{"value": 2},
	})

	select {
	case evt := <-stream:
		payload, ok := evt.Data.(map[string]any)
		if !ok {
			t.Fatalf("expected map payload, got %#v", evt.Data)
		}
		if payload["value"] != 2 {
			t.Fatalf("expected debounced payload to contain latest data, got %#v", payload["value"])
		}
	case <-time.After(5 * window):
		t.Fatal("timeout waiting for debounced event")
	}
}
