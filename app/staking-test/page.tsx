'use client';

import { VerusIDStakingDashboard } from '@/components/verusid-staking-dashboard';

export default function StakingTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎉 Staking Statistics Dashboard
          </h1>
          <p className="text-blue-200">
            Comprehensive staking analytics powered by UTXO database
          </p>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Joanna.VRSC@ - Top Staker</h2>
            <VerusIDStakingDashboard iaddr="iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5" />
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Farinole.VRSC@</h2>
            <VerusIDStakingDashboard iaddr="i41PfpVaaeaodXcc9FEeKHVLbgi3iGXDa8" />
          </div>
        </div>
      </div>
    </div>
  );
}

