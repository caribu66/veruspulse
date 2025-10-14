interface Block {
  hash: string;
  height: number;
}

interface OrphanResult {
  isOrphan: boolean;
  canonicalHash: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export async function isOrphan(
  block: Block,
  getBlockHash: (height: number) => Promise<string | null>
): Promise<OrphanResult> {
  const result: OrphanResult = {
    isOrphan: false,
    canonicalHash: null,
    confidence: 'low',
  };

  try {
    // Get the canonical hash for this height
    const canonicalHash = await getBlockHash(block.height);

    if (!canonicalHash) {
      return result;
    }

    result.canonicalHash = canonicalHash;
    result.isOrphan = block.hash !== canonicalHash;

    // Determine confidence based on block height
    if (block.height > 1000) {
      result.confidence = 'high';
    } else if (block.height > 100) {
      result.confidence = 'medium';
    } else {
      result.confidence = 'low';
    }
  } catch (error) {
    console.warn('Orphan detection failed:', error);
    result.confidence = 'low';
  }

  return result;
}

export function getOrphanStatusColor(
  isOrphan: boolean,
  confidence: string
): string {
  if (!isOrphan) return 'text-green-400';

  switch (confidence) {
    case 'high':
      return 'text-red-400';
    case 'medium':
      return 'text-yellow-400';
    case 'low':
    default:
      return 'text-gray-400';
  }
}

export function getOrphanStatusText(
  isOrphan: boolean,
  confidence: string
): string {
  if (!isOrphan) return 'Canonical';

  switch (confidence) {
    case 'high':
      return 'Orphan (High Confidence)';
    case 'medium':
      return 'Possible Orphan';
    case 'low':
    default:
      return 'Unknown Status';
  }
}

export function getOrphanStatusIcon(isOrphan: boolean): string {
  return isOrphan ? '⚠️' : '✅';
}
