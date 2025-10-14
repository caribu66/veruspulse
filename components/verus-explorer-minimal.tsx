'use client';

import { useState } from 'react';

export function VerusExplorerMinimal() {
  console.log('🚀 VerusExplorerMinimal component mounted');

  const [test, setTest] = useState('Hello World');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-4">Verus Explorer - Minimal Test</h1>
      <p className="text-xl mb-4">Test state: {test}</p>
      <button
        onClick={() => setTest('Button clicked!')}
        className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
      >
        Test Button
      </button>
    </div>
  );
}
