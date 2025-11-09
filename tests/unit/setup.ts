import "@testing-library/jest-dom";

// Mock ResizeObserver for the toast component tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Import vitest for global access
import { vi } from "vitest";
