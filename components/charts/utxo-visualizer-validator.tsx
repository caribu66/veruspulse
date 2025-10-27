'use client';

import { useEffect, useState } from 'react';

interface UTXO {
  value: number;
  confirmations: number;
  status: 'eligible' | 'cooldown' | 'inactive';
  txid?: string;
}

interface UTXOVisualizerValidatorProps {
  utxos: UTXO[];
  width?: number;
  height?: number;
}

export function UTXOVisualizerValidator({
  utxos,
  width = 600,
  height = 400,
}: UTXOVisualizerValidatorProps) {
  const [validationResults, setValidationResults] = useState<any>(null);

  useEffect(() => {
    if (!utxos || utxos.length === 0) {
      setValidationResults(null);
      return;
    }

    // Count UTXOs by status
    const statusCounts = utxos.reduce(
      (acc, utxo) => {
        acc[utxo.status] = (acc[utxo.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Simulate bubble positioning using the same algorithm as the actual chart
    const zoneWidth = width / 3;
    const padding = 20;
    const minRadius = 4;
    const maxRadius = 12;

    // Group UTXOs by status
    const eligibleUtxos = utxos.filter(u => u.status === 'eligible');
    const cooldownUtxos = utxos.filter(u => u.status === 'cooldown');
    const inactiveUtxos = utxos.filter(u => u.status === 'inactive');

    // Calculate value range for radius scaling
    const allValues = utxos.map(u => u.value);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

    const bubbles: Array<UTXO & { x: number; y: number; radius: number }> = [];

    // Process each status group using the same logic as the actual chart
    const processGroup = (group: UTXO[], zoneIndex: number) => {
      const zoneX = zoneIndex * zoneWidth;
      const usableWidth = zoneWidth - padding * 2;
      const usableHeight = height - padding * 2;

      if (group.length === 0) return;

      // Simple grid calculation
      const cols = Math.ceil(Math.sqrt(group.length));
      const rows = Math.ceil(group.length / cols);

      const cellWidth = usableWidth / cols;
      const cellHeight = usableHeight / rows;

      group.forEach((utxo, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);

        // Calculate radius based on value
        const normalizedValue =
          maxValue > minValue
            ? (utxo.value - minValue) / (maxValue - minValue)
            : 0.5;
        const radius = minRadius + normalizedValue * (maxRadius - minRadius);

        // Calculate position within the zone
        const x = zoneX + padding + col * cellWidth + cellWidth / 2;
        const y = padding + row * cellHeight + cellHeight / 2;

        // Ensure position is strictly within zone bounds (same as actual chart)
        const finalX = Math.max(
          zoneX + radius + 5,
          Math.min(zoneX + zoneWidth - radius - 5, x)
        );
        const finalY = Math.max(radius + 5, Math.min(height - radius - 5, y));

        bubbles.push({
          ...utxo,
          x: finalX,
          y: finalY,
          radius: Math.max(minRadius, radius),
        });
      });
    };

    // Process each zone
    processGroup(eligibleUtxos, 0); // Eligible zone
    processGroup(cooldownUtxos, 1); // Cooldown zone
    processGroup(inactiveUtxos, 2); // Inactive zone

    // Check for positioning issues (matching the bubble chart logic)
    const eligibleZone = { min: 0, max: zoneWidth };
    const cooldownZone = { min: zoneWidth, max: zoneWidth * 2 };
    const inactiveZone = { min: zoneWidth * 2, max: width };

    const positioningIssues = bubbles.filter(bubble => {
      const inEligibleZone =
        bubble.x >= eligibleZone.min && bubble.x < eligibleZone.max;
      const inCooldownZone =
        bubble.x >= cooldownZone.min && bubble.x < cooldownZone.max;
      const inInactiveZone =
        bubble.x >= inactiveZone.min && bubble.x < inactiveZone.max;

      if (bubble.status === 'eligible' && !inEligibleZone) return true;
      if (bubble.status === 'cooldown' && !inCooldownZone) return true;
      if (bubble.status === 'inactive' && !inInactiveZone) return true;
      return false;
    });

    // Check for bubbles in wrong zones
    const bubblesInWrongZones = {
      eligibleInCooldown: bubbles.filter(
        b =>
          b.status === 'eligible' &&
          b.x >= cooldownZone.min &&
          b.x < cooldownZone.max
      ),
      eligibleInInactive: bubbles.filter(
        b =>
          b.status === 'eligible' &&
          b.x >= inactiveZone.min &&
          b.x < inactiveZone.max
      ),
      cooldownInEligible: bubbles.filter(
        b =>
          b.status === 'cooldown' &&
          b.x >= eligibleZone.min &&
          b.x < eligibleZone.max
      ),
      cooldownInInactive: bubbles.filter(
        b =>
          b.status === 'cooldown' &&
          b.x >= inactiveZone.min &&
          b.x < inactiveZone.max
      ),
      inactiveInEligible: bubbles.filter(
        b =>
          b.status === 'inactive' &&
          b.x >= eligibleZone.min &&
          b.x < eligibleZone.max
      ),
      inactiveInCooldown: bubbles.filter(
        b =>
          b.status === 'inactive' &&
          b.x >= cooldownZone.min &&
          b.x < cooldownZone.max
      ),
    };

    const results = {
      statusCounts,
      positioningIssues,
      bubblesInWrongZones,
      totalBubbles: bubbles.length,
      zoneBoundaries: {
        eligible: eligibleZone,
        cooldown: cooldownZone,
        inactive: inactiveZone,
      },
    };

    setValidationResults(results);
  }, [utxos, width, height]);

  if (!validationResults) {
    return null;
  }

  const hasIssues =
    validationResults.positioningIssues.length > 0 ||
    Object.values(validationResults.bubblesInWrongZones).some(
      (arr: any) => arr.length > 0
    );

  if (!hasIssues) {
    return (
      <div className="mt-2 p-3 bg-slate-600/10 border border-slate-500/20 rounded-lg">
        <div className="text-slate-300 font-semibold text-sm mb-1">
          ✅ UTXO Visualizer: All Clear
        </div>
        <div className="text-xs text-slate-400">
          Total bubbles: {validationResults.totalBubbles} | All bubbles
          correctly positioned in their designated zones
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-slate-700/10 border border-slate-600/20 rounded-lg">
      <div className="text-slate-300 font-semibold text-sm mb-2">
        🚨 UTXO Visualizer Issues Detected
      </div>

      <div className="text-xs text-slate-400 space-y-1">
        <div>Total bubbles: {validationResults.totalBubbles}</div>
        <div>
          Status counts: Eligible({validationResults.statusCounts.eligible || 0}
          ), Cooldown({validationResults.statusCounts.cooldown || 0}), Inactive(
          {validationResults.statusCounts.inactive || 0})
        </div>

        {validationResults.positioningIssues.length > 0 && (
          <div>
            ❌ Positioning issues: {validationResults.positioningIssues.length}{' '}
            bubbles
          </div>
        )}

        {Object.entries(validationResults.bubblesInWrongZones).map(
          ([key, bubbles]: [string, any]) => {
            if (bubbles.length > 0) {
              return (
                <div key={key}>
                  ❌ {key}: {bubbles.length} bubbles in wrong zone
                </div>
              );
            }
            return null;
          }
        )}
      </div>
    </div>
  );
}
