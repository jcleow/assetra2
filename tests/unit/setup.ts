import "@testing-library/jest-dom";
process.env.NEXT_PUBLIC_GO_PROXY_PREFIX =
  process.env.NEXT_PUBLIC_GO_PROXY_PREFIX ?? "http://localhost/go-api";

// Mock ResizeObserver for the toast component tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Import vitest for global access
import { vi } from "vitest";
