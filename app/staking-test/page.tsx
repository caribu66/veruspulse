'use client';

import { VerusIDStakingDashboard } from '@/components/verusid-staking-dashboard';

export default function StakingTestPage() {
  return (
    <div className="min-h-screen theme-bg-primary p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold theme-text-primary mb-2">
            🎉 Staking Statistics Dashboard
          </h1>
          <p className="theme-text-secondary">
            Comprehensive staking analytics powered by UTXO database
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold theme-text-primary mb-4">
              Joanna.VRSC@ - Top Staker
            </h2>
            <VerusIDStakingDashboard
              iaddr="iPZkWmFAhQSFsgKiLExowaoXvzaor2bBZ5"
              verusID="Joanna.VRSC@"
            />
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold theme-text-primary mb-4">
              Farinole.VRSC@
            </h2>
            <VerusIDStakingDashboard
              iaddr="i41PfpVaaeaodXcc9FEeKHVLbgi3iGXDa8"
              verusID="Farinole.VRSC@"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
