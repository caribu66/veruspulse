import '@testing-library/jest-dom';
import React from 'react';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    constructor(url) {
      this.url = url;
      this.nextUrl = new URL(url);
    }
  },
  NextResponse: {
    json: jest.fn((data, options = {}) => ({
      data,
      status: options.status || 200,
      headers: options.headers || {},
      json: jest.fn().mockResolvedValue(data),
    })),
  },
}));

// Mock fetch - will be overridden in individual tests
global.fetch = jest.fn();

// Mock Request and Response for API route testing
global.Request = class MockRequest {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new Map();
    this.body = options.body;
  }
};

global.Response = class MockResponse {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.headers = new Map();
  }
  json() {
    return Promise.resolve(JSON.parse(this.body));
  }
};

// Mock environment variables
process.env.VERUS_RPC_HOST = 'http://localhost:18843';
process.env.NODE_ENV = 'test';

// Mock ECharts and echarts-for-react - simplified approach
jest.mock('echarts/core', () => ({
  use: jest.fn(),
}));
jest.mock('echarts/charts', () => ({}));
jest.mock('echarts/components', () => ({}));
jest.mock('echarts/renderers', () => ({}));
jest.mock('echarts-for-react/lib/core', () => {
  return function MockEChartsReact(props) {
    return React.createElement('div', {
      'data-testid': 'mock-echarts',
      'data-option': JSON.stringify(props.option || {}),
    });
  };
});

// Provide TextEncoder/TextDecoder in the Jest environment for libraries that expect Web APIs
if (typeof global.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock EventSource for realtime events
global.EventSource = class MockEventSource {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;

    // Simulate connection
    setTimeout(() => {
      if (this.onopen) this.onopen({ type: 'open' });
    }, 0);
  }

  close() {
    this.readyState = 2; // CLOSED
    if (this.onclose) this.onclose({ type: 'close' });
  }

  addEventListener(type, listener) {
    if (type === 'open') this.onopen = listener;
    if (type === 'message') this.onmessage = listener;
    if (type === 'error') this.onerror = listener;
    if (type === 'close') this.onclose = listener;
  }

  removeEventListener(type, _listener) {
    if (type === 'open') this.onopen = null;
    if (type === 'message') this.onmessage = null;
    if (type === 'error') this.onerror = null;
    if (type === 'close') this.onclose = null;
  }
};

// Mock WebSocket for realtime connections
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;

    // Simulate connection
    setTimeout(() => {
      if (this.onopen) this.onopen({ type: 'open' });
    }, 0);
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose({ type: 'close' });
  }

  send(_data) {
    // Mock send functionality
  }
};

// Suppress expected console warnings and errors in tests
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  const message = args[0]?.toString() || '';

  // Suppress expected warnings from components with graceful fallbacks
  const suppressedWarnings = [
    'Failed to fetch UTXO data',
    'Failed to fetch individual stake events',
    'AdvancedUTXOVisualizer: Invalid utxos prop',
    'Heading Hierarchy Issues',
  ];

  if (suppressedWarnings.some(warning => message.includes(warning))) {
    return; // Suppress this warning
  }

  // Allow all other warnings
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  const message = args[0]?.toString() || '';

  // Suppress expected errors from intentional test cases
  const suppressedErrors = [
    'Failed to fetch block reward:',
    'Error fetching UTXO data:',
    'Error fetching block details:',
    'Warning: An update to',
    'was not wrapped in act',
  ];

  if (suppressedErrors.some(error => message.includes(error))) {
    return; // Suppress this error
  }

  // Allow all other errors
  originalError.apply(console, args);
};
