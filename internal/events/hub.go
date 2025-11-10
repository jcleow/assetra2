package events

import (
	"context"
	"strconv"
	"sync"
	"time"
)

// StreamEvent represents a change that should be broadcast to subscribers.
type StreamEvent struct {
	ID         uint64         `json:"id"`
	Cursor     string         `json:"cursor"`
	Type       string         `json:"type"`
	Entity     string         `json:"entity"`
	Action     string         `json:"action"`
	ResourceID string         `json:"resourceId,omitempty"`
	Data       interface{}    `json:"data,omitempty"`
	Timestamp  time.Time      `json:"timestamp"`
	Metadata   map[string]any `json:"metadata,omitempty"`
}

// Hub coordinates publishing events to connected subscribers.
type Hub struct {
	mu             sync.Mutex
	clients        map[int]chan StreamEvent
	nextClientID   int
	history        []StreamEvent
	maxHistory     int
	bufferSize     int
	seq            uint64
	debounceWindow time.Duration
	pending        []StreamEvent
	pendingKeys    map[string]int
	debounceTimer  *time.Timer
}

// Option configures hub behavior.
type Option func(*Hub)

// WithMaxHistory controls how many events are stored for replay during reconnects.
func WithMaxHistory(max int) Option {
	return func(h *Hub) {
		if max > 0 {
			h.maxHistory = max
		}
	}
}

// WithDebounceWindow adjusts how long the hub batches duplicate events before flushing.
func WithDebounceWindow(window time.Duration) Option {
	return func(h *Hub) {
		if window >= 0 {
			h.debounceWindow = window
		}
	}
}

// WithBufferSize sets the per-subscriber channel capacity.
func WithBufferSize(size int) Option {
	return func(h *Hub) {
		if size > 0 {
			h.bufferSize = size
		}
	}
}

// NewHub constructs a publisher with sane defaults.
func NewHub(opts ...Option) *Hub {
	h := &Hub{
		clients:        make(map[int]chan StreamEvent),
		maxHistory:     256,
		bufferSize:     32,
		debounceWindow: 100 * time.Millisecond,
		pendingKeys:    make(map[string]int),
	}
	for _, opt := range opts {
		opt(h)
	}
	return h
}

// Publish queues an event for broadcast, applying lightweight debouncing.
func (h *Hub) Publish(evt StreamEvent) {
	key := evtKey(evt)

	h.mu.Lock()
	if idx, ok := h.pendingKeys[key]; ok {
		h.pending[idx] = evt
	} else {
		h.pendingKeys[key] = len(h.pending)
		h.pending = append(h.pending, evt)
	}

	if h.debounceWindow <= 0 {
		pending := h.pending
		h.pending = nil
		h.pendingKeys = make(map[string]int)
		h.mu.Unlock()
		h.flush(pending)
		return
	}

	if h.debounceTimer == nil {
		h.debounceTimer = time.AfterFunc(h.debounceWindow, h.drainPending)
	} else {
		h.debounceTimer.Reset(h.debounceWindow)
	}
	h.mu.Unlock()
}

// Subscribe registers a subscriber and replays history newer than the cursor.
func (h *Hub) Subscribe(ctx context.Context, cursor string) (<-chan StreamEvent, error) {
	ch := make(chan StreamEvent, h.bufferSize)

	h.mu.Lock()
	id := h.nextClientID
	h.nextClientID++
	h.clients[id] = ch
	backlog := h.backlogLocked(cursor)
	h.mu.Unlock()

	go func() {
		defer h.removeClient(id)
		for _, evt := range backlog {
			select {
			case ch <- evt:
			case <-ctx.Done():
				return
			}
		}

		<-ctx.Done()
	}()

	return ch, nil
}

func (h *Hub) backlogLocked(cursor string) []StreamEvent {
	if len(h.history) == 0 {
		return nil
	}

	var lastID uint64
	if cursor != "" {
		if parsed, err := strconv.ParseUint(cursor, 10, 64); err == nil {
			lastID = parsed
		}
	}

	startIdx := 0
	if lastID > 0 {
		for i, evt := range h.history {
			if evt.ID > lastID {
				startIdx = i
				break
			}
			if i == len(h.history)-1 {
				startIdx = len(h.history)
			}
		}
	}

	if startIdx >= len(h.history) {
		return nil
	}

	out := make([]StreamEvent, len(h.history)-startIdx)
	copy(out, h.history[startIdx:])
	return out
}

func (h *Hub) drainPending() {
	h.mu.Lock()
	pending := h.pending
	h.pending = nil
	h.pendingKeys = make(map[string]int)
	h.debounceTimer = nil
	h.mu.Unlock()

	h.flush(pending)
}

func (h *Hub) flush(events []StreamEvent) {
	for _, evt := range events {
		h.broadcast(evt)
	}
}

func (h *Hub) broadcast(evt StreamEvent) {
	if evt.Timestamp.IsZero() {
		evt.Timestamp = time.Now().UTC()
	}

	h.mu.Lock()
	h.seq++
	evt.ID = h.seq
	evt.Cursor = strconv.FormatUint(evt.ID, 10)

	h.history = append(h.history, evt)
	if len(h.history) > h.maxHistory {
		h.history = h.history[len(h.history)-h.maxHistory:]
	}

	clients := make([]chan StreamEvent, 0, len(h.clients))
	for _, ch := range h.clients {
		clients = append(clients, ch)
	}
	h.mu.Unlock()

	for _, ch := range clients {
		select {
		case ch <- evt:
		default:
			// Drop to provide backpressure – slow consumers can reconnect using cursors.
		}
	}
}

func (h *Hub) removeClient(id int) {
	h.mu.Lock()
	ch, ok := h.clients[id]
	if ok {
		delete(h.clients, id)
		close(ch)
	}
	h.mu.Unlock()
}

func evtKey(evt StreamEvent) string {
	resource := evt.ResourceID
	if resource == "" {
		resource = evt.Entity
	}
	return evt.Entity + ":" + evt.Action + ":" + resource
}
