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

  removeEventListener(type, listener) {
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

  send(data) {
    // Mock send functionality
  }
};
