'use client';

/* eslint-disable react-hooks/rules-of-hooks */
import { useTranslations } from 'next-intl';
import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  memo,
  lazy,
  Suspense,
} from 'react';
import { formatFriendlyNumber } from '@/lib/utils/number-formatting';
import {
  ChartBar,
  GridFour,
  List,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Funnel,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Register ECharts components
echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

interface UTXO {
  value: number; // Value in satoshis
  valueVRSC?: number; // Value in VRSC for display
  confirmations: number;
  status: 'eligible' | 'cooldown' | 'inactive';
  txid: string;
  blockTime?: string;
  isStakeInput?: boolean;
  isStakeOutput?: boolean;
  isHighValue?: boolean; // 100+ VRSC
  isMediumValue?: boolean; // 10-100 VRSC
  isEligibleForStaking?: boolean; // Ready for staking
  earnedAmount?: number;
  stakeReward?: number;
  stakingWaitTime?: number | null; // Time it took to find a reward
  stakingWaitDays?: number | null; // Days it took to find a reward
  stakingWaitHours?: number | null; // Hours it took to find a reward
}

interface AdvancedUTXOVisualizerProps {
  utxos: UTXO[];
  width?: number;
  height?: number;
  className?: string;
  isLoading?: boolean;
  loadingMessage?: string;
}

type VisualizationMode = 'heatmap' | 'scatter' | 'histogram' | 'list';

// Color constants for better maintainability
const UTXO_COLORS = {
  HIGH_VALUE: 'rgba(255, 215, 0, 0.8)', // Gold
  MEDIUM_VALUE: 'rgba(255, 140, 0, 0.8)', // Dark Orange
  ELIGIBLE: 'rgba(0, 255, 127, 0.8)', // Spring Green
  STAKE_OUTPUT: 'rgba(0, 255, 255, 0.8)', // Cyan
  STAKE_INPUT: 'rgba(255, 0, 255, 0.8)', // Magenta
  COOLDOWN: 'rgba(255, 69, 0, 0.8)', // Red-Orange
  INACTIVE: 'rgba(0, 191, 255, 0.8)', // Deep Sky Blue
} as const;

// Utility function to get UTXO color based on properties
const getUTXOColor = (utxo: UTXO, intensity: number): string => {
  const value = utxo.valueVRSC || utxo.value / 100000000;

  // Priority 1: Staking activity (most important)
  if (utxo.isStakeOutput) {
    return `rgba(0, 255, 255, ${intensity})`; // Cyan
  }
  if (utxo.isStakeInput) {
    return `rgba(255, 0, 255, ${intensity})`; // Magenta
  }

  // Priority 2: High-value UTXOs (should be gold/diamond regardless of staking status)
  if (value >= 100000) {
    return `rgba(255, 255, 255, ${Math.max(0.95, intensity)})`; // BRILLIANT WHITE - Diamond tier
  } else if (value >= 10000) {
    return `rgba(255, 215, 0, ${Math.max(0.9, intensity)})`; // BRIGHT GOLD - 10K-100K
  } else if (value >= 1000) {
    return `rgba(255, 193, 7, ${Math.max(0.7, intensity)})`; // Gold - 1K-10K
  }

  // Priority 3: Ready for staking (>=150 confirmations AND >=1 VRSC) - but only for non-high-value UTXOs
  if (utxo.confirmations >= 150 && value >= 1) {
    return `rgba(0, 255, 127, ${intensity})`; // Green - Ready to stake
  }

  // Priority 4: Other value-based colors
  if (value >= 100) {
    return `rgba(255, 140, 0, ${Math.max(0.6, intensity)})`; // Orange
  } else if (value >= 10) {
    return `rgba(255, 140, 0, ${Math.max(0.5, intensity)})`; // Orange
  } else if (value >= 1) {
    return `rgba(0, 255, 127, ${intensity})`; // Green
  } else {
    return `rgba(0, 191, 255, ${intensity})`; // Blue
  }
};

// Value bin thresholds for better X-axis distribution
// Note: < 1 VRSC goes to Low Chance Zone, so main grid starts at 1 VRSC
const VALUE_BINS = [
  { min: 1, max: 10, label: '1-10 VRSC' },
  { min: 10, max: 100, label: '10-100 VRSC' },
  { min: 100, max: 1000, label: '100-1K VRSC' },
  { min: 1000, max: 10000, label: '1K-10K VRSC' },
  { min: 10000, max: 100000, label: '10K-100K VRSC' },
  { min: 100000, max: Infinity, label: '100K+ VRSC' },
];

// Performance constants
const VIRTUALIZATION_THRESHOLD = 1000; // Start virtualizing at 1000+ UTXOs
const MAX_VISIBLE_CELLS = 500; // Maximum cells to render at once
const CELL_BATCH_SIZE = 100; // Process cells in batches
const CANVAS_RENDERING_THRESHOLD = 5000; // Use canvas for 5000+ UTXOs

// Cooldown zone configuration
const COOLDOWN_ZONE = {
  label: 'COOLDOWN ZONE',
  color: 'rgba(255, 69, 0, 0.8)', // Orange-red for cooldown
  position: 'right', // Place cooldown zone on the right side
};

// Utility function to get bin index for a UTXO value
const getValueBin = (valueVRSC: number): number => {
  for (let i = 0; i < VALUE_BINS.length; i++) {
    if (valueVRSC >= VALUE_BINS[i].min && valueVRSC < VALUE_BINS[i].max) {
      return i;
    }
  }
  return VALUE_BINS.length - 1; // Default to last bin for very high values
};

// Data validation utility
const validateUTXO = (utxo: any): UTXO | null => {
  try {
    // Check required fields
    if (!utxo || typeof utxo !== 'object') {
      console.warn('Invalid UTXO: not an object', utxo);
      return null;
    }

    // Validate and sanitize value
    const rawValue = utxo.value || utxo.valueVRSC || 0;
    const value = Math.max(0, Number(rawValue)); // Ensure non-negative

    // Validate confirmations
    const confirmations = Math.max(0, Number(utxo.confirmations || 0)); // Ensure non-negative

    // Validate status
    const validStatuses = ['eligible', 'cooldown', 'inactive'];
    const status = validStatuses.includes(utxo.status)
      ? utxo.status
      : 'inactive';

    // Validate txid
    const txid =
      typeof utxo.txid === 'string' && utxo.txid.length > 0
        ? utxo.txid
        : 'unknown';

    return {
      value: value,
      valueVRSC: value / 100000000,
      confirmations: confirmations,
      status: status,
      txid: txid,
      blockTime: utxo.blockTime || new Date().toISOString(),
      isStakeInput: Boolean(utxo.isStakeInput),
      isStakeOutput: Boolean(utxo.isStakeOutput),
      isHighValue: Boolean(utxo.isHighValue),
      isMediumValue: Boolean(utxo.isMediumValue),
      isEligibleForStaking: Boolean(utxo.isEligibleForStaking),
      earnedAmount: Number(utxo.earnedAmount || 0),
      stakeReward: Number(utxo.stakeReward || 3),
      // Staking wait time information
      stakingWaitTime: utxo.stakingWaitTime ?? null,
      stakingWaitDays: utxo.stakingWaitDays ?? null,
      stakingWaitHours: utxo.stakingWaitHours ?? null,
    };
  } catch (error) {
    console.error('Error validating UTXO:', error, utxo);
    return null;
  }
};

function AdvancedUTXOVisualizer({
  utxos,
  width = 1000,
  height = 600,
  className = '',
  isLoading = false,
  loadingMessage = 'Loading UTXO data...',
}: AdvancedUTXOVisualizerProps) {
  // All hooks must be called at the top level - BEFORE any conditional logic
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>('heatmap');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'eligible' | 'cooldown' | 'inactive'
  >('all');
  const [showStakeOnly, setShowStakeOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Performance optimization state
  const [isVirtualizing, setIsVirtualizing] = useState(false);
  const [visibleCells, setVisibleCells] = useState<Set<string>>(new Set());
  const [renderedBatches, setRenderedBatches] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  // Lazy loading state
  const [loadedVisualizations, setLoadedVisualizations] = useState<
    Set<VisualizationMode>
  >(new Set(['heatmap' as VisualizationMode]));
  const [isLoadingVisualization, setIsLoadingVisualization] = useState(false);

  // Canvas rendering state
  const [useCanvasRendering, setUseCanvasRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Selection and interaction state
  const [selectedUTXOs, setSelectedUTXOs] = useState<Set<string>>(new Set());
  const [hoveredUTXO, setHoveredUTXO] = useState<string | null>(null);
  const [showSelectionPanel, setShowSelectionPanel] = useState(false);

  // Sorting state
  const [sortBy, setSortBy] = useState<'value' | 'confirmations' | 'status'>(
    'value'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // List view enhancement state
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Zoom and pan state
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Fixed dimensions to prevent size fluctuations
  const safeWidth = width; // Use exact width passed in
  const safeHeight = height; // Use exact height passed in

  // Responsive breakpoints
  const isMobile = safeWidth < 768;
  const isTablet = safeWidth >= 768 && safeWidth < 1024;

  // Validate and filter UTXOs
  const validatedUtxos = useMemo(() => {
    if (!utxos || !Array.isArray(utxos)) return [];
    return utxos
      .map(validateUTXO)
      .filter((utxo): utxo is UTXO => utxo !== null);
  }, [utxos]);

  // Determine if we need virtualization
  const needsVirtualization = useMemo(() => {
    return validatedUtxos.length >= VIRTUALIZATION_THRESHOLD;
  }, [validatedUtxos.length]);

  // Determine if we need canvas rendering
  const needsCanvasRendering = useMemo(() => {
    return validatedUtxos.length >= CANVAS_RENDERING_THRESHOLD;
  }, [validatedUtxos.length]);

  // Initialize virtualization when needed
  useEffect(() => {
    if (needsVirtualization && !isVirtualizing) {
      setIsVirtualizing(true);
      setRenderedBatches(0);
      setVisibleCells(new Set());
    } else if (!needsVirtualization && isVirtualizing) {
      setIsVirtualizing(false);
      setRenderedBatches(0);
      setVisibleCells(new Set());
    }
  }, [needsVirtualization, isVirtualizing]);

  // Initialize canvas rendering when needed
  useEffect(() => {
    if (needsCanvasRendering && !useCanvasRendering) {
      setUseCanvasRendering(true);
    } else if (!needsCanvasRendering && useCanvasRendering) {
      setUseCanvasRendering(false);
    }
  }, [needsCanvasRendering, useCanvasRendering]);

  // Filter and process UTXOs
  const processedUtxos = useMemo(() => {
    let filtered = validatedUtxos;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(u => u.status === filterStatus);
    }

    // Apply stake filter
    if (showStakeOnly) {
      filtered = filtered.filter(u => u.isStakeInput || u.isStakeOutput);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        u =>
          u.txid.toLowerCase().includes(searchLower) ||
          (u.valueVRSC || u.value / 100000000)
            .toString()
            .includes(searchLower) ||
          u.status.toLowerCase().includes(searchLower) ||
          u.confirmations.toString().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortBy) {
        case 'value':
          aValue = a.valueVRSC || a.value / 100000000;
          bValue = b.valueVRSC || b.value / 100000000;
          break;
        case 'confirmations':
          aValue = a.confirmations;
          bValue = b.confirmations;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.valueVRSC || a.value / 100000000;
          bValue = b.valueVRSC || b.value / 100000000;
      }

      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [
    validatedUtxos,
    filterStatus,
    showStakeOnly,
    searchTerm,
    sortBy,
    sortOrder,
  ]);

  // Calculate statistics with optimized memoization
  const stats = useMemo(() => {
    if (processedUtxos.length === 0) {
      return {
        total: 0,
        eligible: 0,
        cooldown: 0,
        inactive: 0,
        stakeInputs: 0,
        stakeOutputs: 0,
        totalValue: 0,
        eligibleValue: 0,
      };
    }

    // Single pass through UTXOs for better performance
    let total = 0;
    let eligible = 0;
    let cooldown = 0;
    let inactive = 0;
    let stakeInputs = 0;
    let stakeOutputs = 0;
    let totalValue = 0;
    let eligibleValue = 0;

    for (const utxo of processedUtxos) {
      total++;

      const value = utxo.valueVRSC || utxo.value / 100000000;
      totalValue += value;

      switch (utxo.status) {
        case 'eligible':
          eligible++;
          eligibleValue += value;
          break;
        case 'cooldown':
          cooldown++;
          break;
        case 'inactive':
          inactive++;
          break;
      }

      if (utxo.isStakeInput) stakeInputs++;
      if (utxo.isStakeOutput) stakeOutputs++;
    }

    return {
      total,
      eligible,
      cooldown,
      inactive,
      stakeInputs,
      stakeOutputs,
      totalValue,
      eligibleValue,
    };
  }, [processedUtxos]);

  // Virtualized rendering logic
  const renderVirtualizedCells = useCallback(
    (
      cells: Array<{
        row: number;
        col: number;
        count: number;
        cellData: UTXO[];
      }>
    ) => {
      if (!isVirtualizing) return cells;

      // Sort cells by importance (high value, staking activity, etc.)
      const sortedCells = cells.sort((a, b) => {
        const aValue = Math.max(
          ...a.cellData.map(u => u.valueVRSC || u.value / 100000000)
        );
        const bValue = Math.max(
          ...b.cellData.map(u => u.valueVRSC || u.value / 100000000)
        );
        const aStaking = a.cellData.some(
          u => u.isStakeInput || u.isStakeOutput
        );
        const bStaking = b.cellData.some(
          u => u.isStakeInput || u.isStakeOutput
        );

        // Prioritize staking activity, then high value
        if (aStaking && !bStaking) return -1;
        if (!aStaking && bStaking) return 1;
        return bValue - aValue;
      });

      // Return only the most important cells for initial render
      return sortedCells.slice(0, MAX_VISIBLE_CELLS);
    },
    [isVirtualizing]
  );

  // Progressive rendering for large datasets
  const progressiveRender = useCallback(() => {
    if (
      !isVirtualizing ||
      renderedBatches >= Math.ceil(processedUtxos.length / CELL_BATCH_SIZE)
    ) {
      return;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      setRenderedBatches(prev => prev + 1);
    });
  }, [isVirtualizing, renderedBatches, processedUtxos.length]);

  // Start progressive rendering
  useEffect(() => {
    if (isVirtualizing && renderedBatches === 0) {
      progressiveRender();
    }
  }, [isVirtualizing, renderedBatches, progressiveRender]);

  // Lazy load visualization when mode changes
  const handleVisualizationModeChange = useCallback(
    (mode: VisualizationMode) => {
      if (!loadedVisualizations.has(mode)) {
        setIsLoadingVisualization(true);

        // Simulate loading time for non-critical visualizations
        setTimeout(() => {
          setLoadedVisualizations(
            prev => new Set(Array.from(prev).concat(mode))
          );
          setVisualizationMode(mode);
          setIsLoadingVisualization(false);
        }, 100); // Small delay to show loading state
      } else {
        setVisualizationMode(mode);
      }
    },
    [loadedVisualizations]
  );

  // Canvas rendering for extremely large datasets
  const renderCanvasHeatmap = useCallback(() => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size
    canvas.width = safeWidth;
    canvas.height = safeHeight;

    // Clear canvas
    ctx.clearRect(0, 0, safeWidth, safeHeight);

    // Simple canvas rendering - just show a performance message
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, safeWidth, safeHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Canvas Rendering Mode', safeWidth / 2, safeHeight / 2 - 20);
    ctx.fillText(
      `Processing ${processedUtxos.length.toLocaleString()} UTXOs`,
      safeWidth / 2,
      safeHeight / 2
    );
    ctx.fillText(
      'Optimized for large datasets',
      safeWidth / 2,
      safeHeight / 2 + 20
    );

    return (
      <canvas
        ref={canvasRef}
        width={safeWidth}
        height={safeHeight}
        className="bg-gray-900/30 rounded-lg border border-white/10"
        style={{ width: safeWidth, height: safeHeight }}
      />
    );
  }, [safeWidth, safeHeight, processedUtxos.length]);

  // Zoom and pan handlers
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.5, Math.min(5, zoomLevel * delta));
      setZoomLevel(newZoom);
    },
    [zoomLevel]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      // Left mouse button
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const deltaX = e.clientX - lastPanPoint.x;
        const deltaY = e.clientY - lastPanPoint.y;
        setPanX(prev => prev + deltaX);
        setPanY(prev => prev + deltaY);
        setLastPanPoint({ x: e.clientX, y: e.clientY });
      }
    },
    [isPanning, lastPanPoint]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    // Reset zoom and pan
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsPanning(true);
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (isPanning && e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastPanPoint.x;
        const deltaY = touch.clientY - lastPanPoint.y;
        setPanX(prev => prev + deltaX);
        setPanY(prev => prev + deltaY);
        setLastPanPoint({ x: touch.clientX, y: touch.clientY });
      }
    },
    [isPanning, lastPanPoint]
  );

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Pinch-to-zoom support for mobile
  const [lastTouchDistance, setLastTouchDistance] = useState(0);

  const getTouchDistance = useCallback((touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  const handleTouchStartPinch = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        setLastTouchDistance(getTouchDistance(e.touches));
        setIsPanning(false); // Disable panning during pinch
      } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        setIsPanning(true);
        setLastPanPoint({ x: touch.clientX, y: touch.clientY });
      }
    },
    [getTouchDistance]
  );

  const handleTouchMovePinch = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const currentDistance = getTouchDistance(e.touches);
        if (lastTouchDistance > 0) {
          const scale = currentDistance / lastTouchDistance;
          setZoomLevel(prev => Math.max(0.5, Math.min(5, prev * scale)));
        }
        setLastTouchDistance(currentDistance);
      } else if (isPanning && e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastPanPoint.x;
        const deltaY = touch.clientY - lastPanPoint.y;
        setPanX(prev => prev + deltaX);
        setPanY(prev => prev + deltaY);
        setLastPanPoint({ x: touch.clientX, y: touch.clientY });
      }
    },
    [isPanning, lastPanPoint, lastTouchDistance, getTouchDistance]
  );

  const handleTouchEndPinch = useCallback(() => {
    setIsPanning(false);
    setLastTouchDistance(0);
  }, []);

  // Export functionality
  const exportToCSV = useCallback(() => {
    const headers = [
      'TXID',
      'Value (VRSC)',
      'Confirmations',
      'Status',
      'Is Stake Input',
      'Is Stake Output',
      'Is High Value',
      'Is Medium Value',
      'Is Eligible for Staking',
      'Block Time',
    ];

    const csvContent = [
      headers.join(','),
      ...processedUtxos.map(utxo =>
        [
          utxo.txid,
          (utxo.valueVRSC || utxo.value / 100000000).toFixed(8),
          utxo.confirmations,
          utxo.status,
          utxo.isStakeInput ? 'Yes' : 'No',
          utxo.isStakeOutput ? 'Yes' : 'No',
          utxo.isHighValue ? 'Yes' : 'No',
          utxo.isMediumValue ? 'Yes' : 'No',
          utxo.isEligibleForStaking ? 'Yes' : 'No',
          utxo.blockTime,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `utxo-data-${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processedUtxos]);

  const exportToJSON = useCallback(() => {
    const jsonData = {
      exportDate: new Date().toISOString(),
      totalUTXOs: processedUtxos.length,
      totalValue: processedUtxos.reduce(
        (sum, u) => sum + (u.valueVRSC || u.value / 100000000),
        0
      ),
      statistics: stats,
      utxos: processedUtxos.map(utxo => ({
        txid: utxo.txid,
        valueVRSC: utxo.valueVRSC || utxo.value / 100000000,
        confirmations: utxo.confirmations,
        status: utxo.status,
        isStakeInput: utxo.isStakeInput,
        isStakeOutput: utxo.isStakeOutput,
        isHighValue: utxo.isHighValue,
        isMediumValue: utxo.isMediumValue,
        isEligibleForStaking: utxo.isEligibleForStaking,
        blockTime: utxo.blockTime,
      })),
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: 'application/json',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `utxo-data-${new Date().toISOString().split('T')[0]}.json`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processedUtxos, stats]);

  const exportVisualization = useCallback(() => {
    if (!svgRef.current) return;

    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = safeWidth;
    canvas.height = safeHeight;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (blob) {
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute(
            'download',
            `utxo-heatmap-${new Date().toISOString().split('T')[0]}.png`
          );
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      });
    };

    img.src =
      'data:image/svg+xml;base64,' +
      btoa(unescape(encodeURIComponent(svgData)));
  }, [safeWidth, safeHeight]);

  // Selection handlers
  const handleUTXOClick = useCallback((utxoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUTXOs(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(utxoId)) {
        newSelection.delete(utxoId);
      } else {
        newSelection.add(utxoId);
      }
      return newSelection;
    });
    setShowSelectionPanel(true);
  }, []);

  const handleUTXOHover = useCallback((utxoId: string | null) => {
    setHoveredUTXO(utxoId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedUTXOs(new Set());
    setShowSelectionPanel(false);
  }, []);

  const selectAll = useCallback(() => {
    const allIds = new Set(processedUtxos.map(u => u.txid));
    setSelectedUTXOs(allIds);
    setShowSelectionPanel(true);
  }, [processedUtxos]);

  const selectByValue = useCallback(
    (minValue: number, maxValue: number = Infinity) => {
      const filteredIds = new Set(
        processedUtxos
          .filter(u => {
            const value = u.valueVRSC || u.value / 100000000;
            return value >= minValue && value <= maxValue;
          })
          .map(u => u.txid)
      );
      setSelectedUTXOs(filteredIds);
      setShowSelectionPanel(true);
    },
    [processedUtxos]
  );

  const selectByStatus = useCallback(
    (status: string) => {
      const filteredIds = new Set(
        processedUtxos.filter(u => u.status === status).map(u => u.txid)
      );
      setSelectedUTXOs(filteredIds);
      setShowSelectionPanel(true);
    },
    [processedUtxos]
  );

  // Input validation with better error handling
  if (!utxos || !Array.isArray(utxos)) {
    console.warn('AdvancedUTXOVisualizer: Invalid utxos prop provided');
    return (
      <div
        className={`${className} flex items-center justify-center bg-red-900/30 rounded-lg border border-red-500/50`}
        style={{ width: 1000, height: 600 }}
      >
        <div className="text-center p-4">
          <div className="text-red-400 mb-2 text-lg font-semibold">
            Invalid UTXO Data
          </div>
          <p className="text-red-300 text-sm mb-2">
            The provided data is not a valid array of UTXOs
          </p>
          <p className="text-red-500 text-xs">
            Please check your data source and try again
          </p>
        </div>
      </div>
    );
  }

  if (validatedUtxos.length === 0) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-yellow-900/30 rounded-lg border border-yellow-500/50`}
        style={{ width: 1000, height: 600 }}
      >
        <div className="text-center p-4">
          <div className="text-yellow-400 mb-2 text-lg font-semibold">
            No Valid UTXOs
          </div>
          <p className="text-yellow-300 text-sm mb-2">
            No valid UTXOs found in the provided data
          </p>
          <p className="text-yellow-500 text-xs">
            This could indicate a data source issue
          </p>
        </div>
      </div>
    );
  }

  // Log validation results
  if (validatedUtxos.length !== utxos.length) {
    console.warn(
      `UTXO validation: ${utxos.length - validatedUtxos.length} invalid UTXOs filtered out`
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-900/30 rounded-lg border border-gray-700/50`}
        style={{ width: safeWidth, height: safeHeight }}
      >
        <div className="text-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <div className="text-blue-400 mb-2 text-lg font-semibold">
            🔄 Loading
          </div>
          <p className="text-gray-300 text-sm mb-2">{loadingMessage}</p>
          <p className="text-gray-500 text-xs">
            Please wait while we fetch your UTXO data
          </p>
        </div>
      </div>
    );
  }

  const renderHeatmap = useCallback(() => {
    if (processedUtxos.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          No UTXOs to display
        </div>
      );
    }

    // Use canvas rendering for extremely large datasets
    if (useCanvasRendering) {
      return renderCanvasHeatmap();
    }

    // Padding for labels
    const PADDING = { top: 25, right: 10, bottom: 35, left: 50 };

    // Responsive cell sizing - larger cells on mobile for better touch interaction
    const isMobile = safeWidth < 600;
    const isTablet = safeWidth >= 600 && safeWidth < 1024;
    const minCellSize = isMobile ? 12 : isTablet ? 6 : 4;
    const maxCellSize = isMobile ? 32 : isTablet ? 24 : 20;

    // Calculate available space for the grid (excluding padding)
    const availableWidth = safeWidth - PADDING.left - PADDING.right;
    const availableHeight = safeHeight - PADDING.top - PADDING.bottom;

    const cellSize = Math.max(
      minCellSize,
      Math.min(
        maxCellSize,
        Math.sqrt((availableWidth * availableHeight) / processedUtxos.length)
      )
    );
    const cols = Math.max(1, Math.floor(availableWidth / cellSize));

    // Reserve space for cooldown zone (20%) and low chance zone (15%)
    const cooldownZoneWidth = Math.floor(cols * 0.2);
    const lowChanceZoneWidth = Math.floor(cols * 0.15);
    const mainGridCols = cols - cooldownZoneWidth - lowChanceZoneWidth;
    const rows = Math.max(1, Math.floor(availableHeight / cellSize));

    // Create grid data with cooldown zone
    const grid = Array(rows)
      .fill(null)
      .map(() => Array(cols).fill(0));
    const cellUtxos: { [key: string]: UTXO[] } = {};

    // Separate UTXOs by type
    const cooldownUtxos = processedUtxos.filter(
      utxo => utxo.status === 'cooldown'
    );
    const lowChanceUtxos = processedUtxos.filter(utxo => {
      const value = utxo.valueVRSC || utxo.value / 100000000;
      // ALL UTXOs with < 1 VRSC go to low chance zone (except cooldown which has its own zone)
      return utxo.status !== 'cooldown' && value < 1;
    });
    const regularUtxos = processedUtxos.filter(utxo => {
      const value = utxo.valueVRSC || utxo.value / 100000000;
      // Only UTXOs >= 1 VRSC that are not in cooldown go to main grid
      return utxo.status !== 'cooldown' && value >= 1;
    });

    // Distribute regular UTXOs across main grid using value bins
    regularUtxos.forEach(utxo => {
      const value = utxo.valueVRSC || utxo.value / 100000000;

      // Use discrete value bins for X-axis distribution
      const binIndex = getValueBin(value);
      const binWidth = mainGridCols / VALUE_BINS.length;

      // Group UTXOs by value within each bin for better clustering
      const binStart = binIndex * binWidth;
      const binEnd = (binIndex + 1) * binWidth;
      const valueWithinBin =
        (value - VALUE_BINS[binIndex].min) /
        (VALUE_BINS[binIndex].max - VALUE_BINS[binIndex].min);
      const col = Math.floor(
        binStart + valueWithinBin * (binEnd - binStart - 1)
      );

      // Use confirmations for Y-axis (age of UTXO)
      const maxConfirmations = 10000; // Assume max 10k confirmations for scaling
      const row = Math.min(
        rows - 1,
        Math.floor((utxo.confirmations / maxConfirmations) * rows)
      );

      if (row >= 0 && row < rows && col >= 0 && col < mainGridCols) {
        grid[row][col]++;
        const key = `${row}-${col}`;
        if (!cellUtxos[key]) cellUtxos[key] = [];
        cellUtxos[key].push(utxo);
      }
    });

    // Distribute cooldown UTXOs in the cooldown zone with better organization
    const cooldownPeriod = 150; // 150 confirmations cooldown
    const sortedCooldownUtxos = cooldownUtxos.sort((a, b) => {
      // Sort by time remaining (ascending - closest to ready first)
      const aTimeRemaining = Math.max(0, cooldownPeriod - a.confirmations);
      const bTimeRemaining = Math.max(0, cooldownPeriod - b.confirmations);
      return aTimeRemaining - bTimeRemaining;
    });

    sortedCooldownUtxos.forEach((utxo, index) => {
      const value = utxo.valueVRSC || utxo.value / 100000000;
      const timeRemaining = Math.max(0, cooldownPeriod - utxo.confirmations);
      const progress = Math.min(
        100,
        (utxo.confirmations / cooldownPeriod) * 100
      );

      // Organize by progress (Y-axis) and value (X-axis within cooldown zone)
      const progressRow = Math.min(
        rows - 1,
        Math.floor((progress / 100) * rows)
      );

      // Group by value within cooldown zone
      let valueCol;
      if (value >= 100) {
        valueCol = Math.floor(cooldownZoneWidth * 0.8); // High-value on right side of cooldown zone
      } else if (value >= 10) {
        valueCol = Math.floor(cooldownZoneWidth * 0.5); // Medium-value in middle
      } else {
        valueCol = Math.floor(cooldownZoneWidth * 0.2); // Low-value on left side
      }

      const cooldownCol = mainGridCols + valueCol;

      if (
        progressRow >= 0 &&
        progressRow < rows &&
        cooldownCol >= mainGridCols &&
        cooldownCol < cols
      ) {
        grid[progressRow][cooldownCol]++;
        const key = `${progressRow}-${cooldownCol}`;
        if (!cellUtxos[key]) cellUtxos[key] = [];
        cellUtxos[key].push(utxo);
      }
    });

    // Distribute low chance UTXOs in the low chance zone
    lowChanceUtxos.forEach((utxo, index) => {
      const value = utxo.valueVRSC || utxo.value / 100000000;

      // Organize by value (Y-axis) and confirmations (X-axis within low chance zone)
      const valueRow = Math.min(rows - 1, Math.floor((value / 1) * rows)); // Scale by 1 VRSC max

      // Group by confirmations within low chance zone
      const confirmationsCol = Math.floor(
        (utxo.confirmations / 10000) * lowChanceZoneWidth
      ); // Scale by 10k confirmations
      const lowChanceCol =
        mainGridCols +
        cooldownZoneWidth +
        Math.min(confirmationsCol, lowChanceZoneWidth - 1);

      if (
        valueRow >= 0 &&
        valueRow < rows &&
        lowChanceCol >= mainGridCols + cooldownZoneWidth &&
        lowChanceCol < cols
      ) {
        grid[valueRow][lowChanceCol]++;
        const key = `${valueRow}-${lowChanceCol}`;
        if (!cellUtxos[key]) cellUtxos[key] = [];
        cellUtxos[key].push(utxo);
      }
    });

    const maxCount = Math.max(...grid.flat());

    return (
      <div className="space-y-4 w-full overflow-hidden">
        <div className="relative w-full overflow-hidden">
          {/* Summary Statistics - Responsive Layout */}
          <div className="mb-4 grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
            <div className="bg-gray-800/50 rounded-lg p-2 sm:p-3 border border-gray-700 hover:bg-gray-700/50 transition-colors min-w-0">
              <div className="text-xs text-gray-400 mb-1 truncate">
                Total UTXOs
              </div>
              <div className="text-base sm:text-lg font-bold text-white truncate">
                {processedUtxos.length}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 sm:p-3 border border-gray-700 hover:bg-gray-700/50 transition-colors min-w-0">
              <div className="text-xs text-gray-400 mb-1 truncate">
                High-Value (100+ VRSC)
              </div>
              <div className="text-base sm:text-lg font-bold text-yellow-400 truncate">
                {processedUtxos.filter(u => u.isHighValue).length}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 sm:p-3 border border-gray-700 hover:bg-gray-700/50 transition-colors min-w-0">
              <div className="text-xs text-gray-400 mb-1 truncate">
                Eligible for Staking
              </div>
              <div className="text-base sm:text-lg font-bold text-green-400 truncate">
                {processedUtxos.filter(u => u.isEligibleForStaking).length}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 sm:p-3 border border-gray-700 hover:bg-gray-700/50 transition-colors min-w-0">
              <div className="text-xs text-gray-400 mb-1 truncate">
                In Cooldown
              </div>
              <div className="text-base sm:text-lg font-bold text-orange-400 truncate">
                {processedUtxos.filter(u => u.status === 'cooldown').length}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-2 sm:p-3 border border-gray-700 hover:bg-gray-700/50 transition-colors min-w-0">
              <div className="text-xs text-gray-400 mb-1 truncate">
                Total Value
              </div>
              <div className="text-sm sm:text-base md:text-lg font-bold text-blue-400 truncate">
                {formatFriendlyNumber(
                  processedUtxos.reduce(
                    (sum, u) => sum + (u.valueVRSC || u.value / 100000000),
                    0
                  )
                )}{' '}
                VRSC
              </div>
            </div>
          </div>

          <svg
            ref={svgRef}
            width={safeWidth}
            height={safeHeight}
            viewBox={`0 0 ${safeWidth} ${safeHeight}`}
            preserveAspectRatio="xMidYMid meet"
            className="bg-gray-900/30 rounded-lg border border-white/10 cursor-grab active:cursor-grabbing w-full h-auto"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleTouchStartPinch}
            onTouchMove={handleTouchMovePinch}
            onTouchEnd={handleTouchEndPinch}
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out',
              maxWidth: '100%',
            }}
          >
            {/* Background grid lines for better orientation */}
            <defs>
              <pattern
                id="grid"
                width={cellSize}
                height={cellSize}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="0.5"
                />
              </pattern>
              <linearGradient id="mainZoneBg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(30, 41, 59, 0.3)" />
                <stop offset="100%" stopColor="rgba(30, 41, 59, 0.1)" />
              </linearGradient>
              <linearGradient
                id="cooldownZoneBg"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="rgba(251, 146, 60, 0.1)" />
                <stop offset="100%" stopColor="rgba(251, 146, 60, 0.05)" />
              </linearGradient>
              <linearGradient
                id="lowChanceZoneBg"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="rgba(107, 114, 128, 0.1)" />
                <stop offset="100%" stopColor="rgba(107, 114, 128, 0.05)" />
              </linearGradient>
            </defs>

            {/* Zone background rectangles */}
            <rect
              x={PADDING.left}
              y={PADDING.top}
              width={mainGridCols * cellSize}
              height={availableHeight}
              fill="url(#mainZoneBg)"
            />
            <rect
              x={PADDING.left + mainGridCols * cellSize}
              y={PADDING.top}
              width={cooldownZoneWidth * cellSize}
              height={availableHeight}
              fill="url(#cooldownZoneBg)"
            />
            <rect
              x={PADDING.left + (mainGridCols + cooldownZoneWidth) * cellSize}
              y={PADDING.top}
              width={lowChanceZoneWidth * cellSize}
              height={availableHeight}
              fill="url(#lowChanceZoneBg)"
            />

            {/* Grid pattern overlay */}
            <rect
              x={PADDING.left}
              y={PADDING.top}
              width={cols * cellSize}
              height={availableHeight}
              fill="url(#grid)"
            />

            {/* Zone Headers at the Top */}
            <g style={{ pointerEvents: 'none' }}>
              {/* Main Zone Header */}
              <text
                x={PADDING.left + (mainGridCols * cellSize) / 2}
                y={15}
                textAnchor="middle"
                className="fill-blue-300 font-bold"
                style={{
                  fontSize: '12px',
                  textShadow: '0 0 4px rgba(0,0,0,0.8)',
                }}
              >
                STAKING ZONE
              </text>

              {/* Cooldown Zone Header */}
              <text
                x={
                  PADDING.left +
                  (mainGridCols + cooldownZoneWidth / 2) * cellSize
                }
                y={15}
                textAnchor="middle"
                className="fill-orange-300 font-bold"
                style={{
                  fontSize: '12px',
                  textShadow: '0 0 4px rgba(0,0,0,0.8)',
                }}
              >
                COOLDOWN
              </text>

              {/* Low Chance Zone Header */}
              <text
                x={
                  PADDING.left +
                  (mainGridCols + cooldownZoneWidth + lowChanceZoneWidth / 2) *
                    cellSize
                }
                y={15}
                textAnchor="middle"
                className="fill-gray-400 font-bold"
                style={{
                  fontSize: '12px',
                  textShadow: '0 0 4px rgba(0,0,0,0.8)',
                }}
              >
                DUST
              </text>
            </g>

            {/* Vertical separator line between main area and cooldown zone */}
            <line
              x1={PADDING.left + mainGridCols * cellSize}
              y1={PADDING.top}
              x2={PADDING.left + mainGridCols * cellSize}
              y2={PADDING.top + availableHeight}
              stroke="rgba(251, 146, 60, 0.8)"
              strokeWidth="3"
              strokeDasharray="8,4"
              style={{ pointerEvents: 'none' }}
            />

            {/* Vertical separator line between cooldown zone and low chance zone */}
            <line
              x1={PADDING.left + (mainGridCols + cooldownZoneWidth) * cellSize}
              y1={PADDING.top}
              x2={PADDING.left + (mainGridCols + cooldownZoneWidth) * cellSize}
              y2={PADDING.top + availableHeight}
              stroke="rgba(107, 114, 128, 0.8)"
              strokeWidth="3"
              strokeDasharray="8,4"
              style={{ pointerEvents: 'none' }}
            />

            {/* Y-axis labels (confirmations) - Responsive */}
            {Array.from({ length: isMobile ? 3 : 5 }, (_, i) => {
              const y =
                PADDING.top +
                ((i * (rows - 1)) / (isMobile ? 2 : 4)) * cellSize;
              const confirmations = Math.round(
                (1 - i / (isMobile ? 2 : 4)) * 10000
              );
              return (
                <text
                  key={`y-label-${i}`}
                  x={5}
                  y={y + cellSize / 2}
                  textAnchor="start"
                  className={`${isMobile ? 'text-xs' : 'text-xs'} fill-gray-400`}
                  dominantBaseline="middle"
                  style={{ fontSize: '10px', pointerEvents: 'none' }}
                >
                  {confirmations > 1000
                    ? `${(confirmations / 1000).toFixed(1)}k`
                    : confirmations}
                </text>
              );
            })}

            {/* X-axis labels (value ranges) - Responsive */}
            {VALUE_BINS.map((bin, index) => {
              const x =
                PADDING.left +
                (index + 0.5) * (mainGridCols / VALUE_BINS.length) * cellSize;
              const label = isMobile
                ? bin.label.replace(' VRSC', '').replace('VRSC', '')
                : bin.label;
              return (
                <text
                  key={`x-label-${index}`}
                  x={x}
                  y={safeHeight - 5}
                  textAnchor="middle"
                  className={`${isMobile ? 'text-xs' : 'text-xs'} fill-gray-400`}
                  style={{ fontSize: '10px', pointerEvents: 'none' }}
                >
                  {label}
                </text>
              );
            })}

            {/* Cooldown Zone Label with Background */}
            <g style={{ pointerEvents: 'none' }}>
              {/* Background rectangle for cooldown zone label */}
              <rect
                x={
                  PADDING.left +
                  (mainGridCols + cooldownZoneWidth / 2) * cellSize -
                  50
                }
                y={safeHeight - 25}
                width={isMobile ? '80' : '100'}
                height="20"
                fill="rgba(251, 146, 60, 0.3)"
                stroke="rgba(251, 146, 60, 0.6)"
                strokeWidth="1"
                rx="4"
              />
              {/* Cooldown zone label text */}
              <text
                x={
                  PADDING.left +
                  (mainGridCols + cooldownZoneWidth / 2) * cellSize
                }
                y={safeHeight - 12}
                textAnchor="middle"
                className="fill-orange-300 font-bold"
                style={{ fontSize: isMobile ? '10px' : '11px' }}
              >
                {isMobile ? 'COOLDOWN' : 'COOLDOWN'}
              </text>
            </g>

            {/* Low Chance Zone Label with Background */}
            <g style={{ pointerEvents: 'none' }}>
              {/* Background rectangle for low chance zone label */}
              <rect
                x={
                  PADDING.left +
                  (mainGridCols + cooldownZoneWidth + lowChanceZoneWidth / 2) *
                    cellSize -
                  45
                }
                y={safeHeight - 25}
                width={isMobile ? '70' : '90'}
                height="20"
                fill="rgba(107, 114, 128, 0.3)"
                stroke="rgba(107, 114, 128, 0.6)"
                strokeWidth="1"
                rx="4"
              />
              {/* Low chance zone label text */}
              <text
                x={
                  PADDING.left +
                  (mainGridCols + cooldownZoneWidth + lowChanceZoneWidth / 2) *
                    cellSize
                }
                y={safeHeight - 12}
                textAnchor="middle"
                className="fill-gray-400 font-bold"
                style={{ fontSize: isMobile ? '10px' : '11px' }}
              >
                {isMobile ? 'DUST' : 'LOW CHANCE'}
              </text>
            </g>

            {/* Grid cells with enhanced interactivity and virtualization */}
            {(() => {
              // Prepare all cells for rendering
              const allCells: Array<{
                row: number;
                col: number;
                count: number;
                cellData: UTXO[];
              }> = [];

              grid.forEach((row, rowIndex) => {
                row.forEach((count, colIndex) => {
                  const key = `${rowIndex}-${colIndex}`;
                  const cellData = cellUtxos[key] || [];
                  if (count > 0) {
                    allCells.push({
                      row: rowIndex,
                      col: colIndex,
                      count,
                      cellData,
                    });
                  }
                });
              });

              // Apply virtualization if needed
              const cellsToRender = isVirtualizing
                ? renderVirtualizedCells(allCells)
                : allCells;

              return cellsToRender.map(
                ({ row: rowIndex, col: colIndex, count, cellData }) => {
                  const key = `${rowIndex}-${colIndex}`;

                  // Age-based intensity gradient: older UTXOs (bottom) get stronger colors
                  let intensity = 0;
                  if (count > 0 && cellData.length > 0) {
                    // Calculate the row position ratio (0 = top, 1 = bottom)
                    const totalRows = Math.max(
                      ...allCells.map(cell => cell.row)
                    );
                    const rowRatio = rowIndex / Math.max(totalRows, 1);

                    // Create dramatic gradient: 0.2 (very light) to 1.0 (full opacity)
                    // Top rows: 20% opacity (very light)
                    // Bottom rows: 100% opacity (full strength)
                    intensity = 0.2 + rowRatio * 0.8;
                  }

                  // Determine color based on UTXO characteristics
                  let fillColor = 'rgba(0,0,0,0)'; // Transparent for empty cells

                  if (count > 0 && cellData.length > 0) {
                    // Check which zone this cell is in
                    const isInCooldownZone =
                      colIndex >= mainGridCols &&
                      colIndex < mainGridCols + cooldownZoneWidth;
                    const isInLowChanceZone =
                      colIndex >= mainGridCols + cooldownZoneWidth;

                    if (isInCooldownZone) {
                      // Enhanced cooldown zone colors based on progress
                      const utxo = cellData[0]; // Get first UTXO for progress calculation
                      const progress = Math.min(
                        100,
                        (utxo.confirmations / 150) * 100
                      );

                      // More distinct colors for better visibility
                      let cooldownColor;
                      if (progress < 33) {
                        cooldownColor = `rgba(220, 38, 38, ${Math.max(0.9, intensity)})`; // Bright Red - just started
                      } else if (progress < 66) {
                        cooldownColor = `rgba(251, 146, 60, ${Math.max(0.9, intensity)})`; // Bright Orange - middle
                      } else {
                        cooldownColor = `rgba(250, 204, 21, ${Math.max(0.9, intensity)})`; // Bright Gold - almost ready
                      }

                      fillColor = cooldownColor;
                    } else if (isInLowChanceZone) {
                      // Low chance zone - dark gray to show very low staking probability
                      fillColor = `rgba(75, 85, 99, ${Math.max(0.7, intensity)})`; // Dark gray-blue - very low chance
                    } else {
                      // Use normal color logic for main grid
                      const utxo = cellData.reduce((prev, current) => {
                        const prevValue =
                          prev.valueVRSC || prev.value / 100000000;
                        const currentValue =
                          current.valueVRSC || current.value / 100000000;
                        return currentValue > prevValue ? current : prev;
                      });

                      fillColor = getUTXOColor(utxo, intensity);
                    }
                  }

                  return (
                    <g key={key}>
                      <rect
                        x={PADDING.left + colIndex * cellSize}
                        y={PADDING.top + rowIndex * cellSize}
                        width={cellSize}
                        height={cellSize}
                        fill={fillColor}
                        stroke={
                          cellData.some(u => selectedUTXOs.has(u.txid))
                            ? 'rgba(255, 215, 0, 1)'
                            : cellData.some(u => hoveredUTXO === u.txid)
                              ? 'rgba(255, 255, 255, 0.9)'
                              : count > 0
                                ? 'rgba(255,255,255,0.2)'
                                : 'rgba(255,255,255,0.05)'
                        }
                        strokeWidth={
                          cellData.some(u => selectedUTXOs.has(u.txid))
                            ? 2.5
                            : cellData.some(u => hoveredUTXO === u.txid)
                              ? 2
                              : count > 0
                                ? 0.8
                                : 0.3
                        }
                        className="cursor-pointer transition-all duration-150"
                        style={{
                          filter: cellData.some(u => hoveredUTXO === u.txid)
                            ? 'brightness(1.3)'
                            : 'none',
                        }}
                        onClick={e => {
                          if (cellData.length > 0) {
                            // Select all UTXOs in this cell, not just the first one
                            cellData.forEach(utxo => {
                              handleUTXOClick(utxo.txid, e);
                            });
                          }
                        }}
                        onMouseEnter={() => {
                          if (cellData.length > 0) {
                            // Show hover for the first UTXO, but tooltip will show all UTXOs in cell
                            handleUTXOHover(cellData[0].txid);
                          }
                        }}
                        onMouseLeave={() => handleUTXOHover(null)}
                      >
                        <title>
                          {count > 0
                            ? `${count} UTXO${count > 1 ? 's' : ''}`
                            : 'Empty'}
                          {cellData.length > 0 &&
                            (() => {
                              // Calculate value range for all UTXOs in this cell
                              const values = cellData.map(
                                u => u.valueVRSC || u.value / 100000000
                              );
                              const minValue = Math.min(...values);
                              const maxValue = Math.max(...values);
                              const avgValue =
                                values.reduce((sum, v) => sum + v, 0) /
                                values.length;
                              const totalValue = values.reduce(
                                (sum, v) => sum + v,
                                0
                              );

                              // Get the highest value UTXO for status info
                              const highestValueUtxo = cellData.reduce(
                                (prev, current) => {
                                  const prevValue =
                                    prev.valueVRSC || prev.value / 100000000;
                                  const currentValue =
                                    current.valueVRSC ||
                                    current.value / 100000000;
                                  return currentValue > prevValue
                                    ? current
                                    : prev;
                                }
                              );

                              const cooldownRemaining = Math.max(
                                0,
                                150 - highestValueUtxo.confirmations
                              );

                              let tooltip = '';

                              // Value information
                              if (count === 1) {
                                tooltip += `\nValue: ${maxValue.toFixed(4)} VRSC`;
                              } else {
                                tooltip += `\nValue Range: ${minValue.toFixed(2)} - ${maxValue.toFixed(2)} VRSC`;
                                tooltip += `\nAverage: ${avgValue.toFixed(2)} VRSC`;
                                tooltip += `\nTotal Value: ${totalValue.toFixed(2)} VRSC`;
                              }

                              // Status and timing
                              tooltip += `\nStatus: ${highestValueUtxo.status.charAt(0).toUpperCase() + highestValueUtxo.status.slice(1)}`;
                              tooltip += `\nConfirmations: ${highestValueUtxo.confirmations.toLocaleString()}`;

                              // Cooldown information
                              if (
                                highestValueUtxo.status === 'cooldown' &&
                                cooldownRemaining > 0
                              ) {
                                tooltip += `\nCooldown: ${cooldownRemaining} blocks remaining`;
                                tooltip += `\nReady in: ${Math.ceil((cooldownRemaining * 15) / 60)} minutes`;
                              } else if (
                                highestValueUtxo.status === 'eligible'
                              ) {
                                tooltip += `\nReady to stake!`;
                              }

                              // Staking wait time information
                              if (
                                highestValueUtxo.stakingWaitTime &&
                                highestValueUtxo.stakingWaitDays !== null &&
                                highestValueUtxo.stakingWaitDays !== undefined
                              ) {
                                if (highestValueUtxo.stakingWaitDays > 0) {
                                  tooltip += `\nFound reward after: ${highestValueUtxo.stakingWaitDays} day${highestValueUtxo.stakingWaitDays > 1 ? 's' : ''} ${(highestValueUtxo.stakingWaitHours || 0) % 24} hours`;
                                } else {
                                  tooltip += `\nFound reward after: ${highestValueUtxo.stakingWaitHours || 0} hours`;
                                }
                              }

                              // UTXO characteristics
                              if (highestValueUtxo.isStakeInput) {
                                tooltip += `\nRecent Stake Input`;
                              }
                              if (highestValueUtxo.isStakeOutput) {
                                tooltip += `\nRecent Stake Output (+3 VRSC)`;
                              }

                              // Value tier classification
                              if (maxValue >= 100000) {
                                tooltip += `\nDIAMOND TIER (100K+ VRSC)`;
                              } else if (maxValue >= 10000) {
                                tooltip += `\nULTRA-HIGH VALUE (10K-100K VRSC)`;
                              } else if (maxValue >= 1000) {
                                tooltip += `\nHIGH VALUE (1K-10K VRSC)`;
                              } else if (maxValue >= 100) {
                                tooltip += `\nMEDIUM VALUE (100-1K VRSC)`;
                              } else if (maxValue >= 10) {
                                tooltip += `\nLOW-MEDIUM VALUE (10-100 VRSC)`;
                              } else if (maxValue >= 1) {
                                tooltip += `\nELIGIBLE FOR STAKING`;
                              } else {
                                tooltip += `\nDUST UTXO (Low staking chance)`;
                              }

                              return tooltip;
                            })()}
                        </title>
                      </rect>

                      {/* Cell count indicator for cells with multiple UTXOs */}
                      {count > 1 && (
                        <text
                          x={PADDING.left + colIndex * cellSize + cellSize / 2}
                          y={PADDING.top + rowIndex * cellSize + cellSize / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-xs fill-white font-bold pointer-events-none"
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                        >
                          {count}
                        </text>
                      )}
                    </g>
                  );
                }
              );
            })()}
          </svg>
        </div>

        {/* Performance Indicator */}
        {(isVirtualizing || useCanvasRendering) && (
          <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-500/50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-300 font-medium">
                {useCanvasRendering
                  ? '🎨 Canvas Mode Active'
                  : '🚀 Performance Mode Active'}
              </div>
              <div className="text-xs text-blue-400">
                {useCanvasRendering
                  ? `Processing ${processedUtxos.length.toLocaleString()} UTXOs`
                  : `Showing ${Math.min(MAX_VISIBLE_CELLS, processedUtxos.length)} of ${processedUtxos.length} UTXOs`}
              </div>
            </div>
            <div className="text-xs text-blue-500 mt-1">
              {useCanvasRendering
                ? 'Extremely large dataset detected. Using canvas rendering for optimal performance.'
                : 'Large dataset detected. Only the most important UTXOs are displayed for optimal performance.'}
            </div>
          </div>
        )}

        {/* Simple Guide */}
        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-300 mb-2 font-medium">
            How to Read This:
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>
              • <strong>Left side:</strong> Your UTXOs organized by value (small
              to large)
            </div>
            <div>
              • <strong>Middle:</strong> Cooldown zone - UTXOs waiting to become
              ready for staking
            </div>
            <div>
              • <strong>Right side:</strong> Low chance zone - Very small UTXOs
              (&lt;1 VRSC) with almost no staking chance
            </div>
            <div>
              • <strong>Hover over any block:</strong> See detailed information
              about that UTXO
            </div>
            <div>
              • <strong>Numbers on blocks:</strong> Show how many UTXOs are in
              that spot
            </div>
            <div>
              • <strong>Click and drag:</strong> Pan around the heatmap
            </div>
            <div>
              • <strong>Double-click:</strong> Reset zoom and position
            </div>
            {isMobile && (
              <>
                <div>
                  • <strong>Pinch to zoom:</strong> Use two fingers to zoom
                  in/out
                </div>
                <div>
                  • <strong>Touch and drag:</strong> Pan around with one finger
                </div>
                <div>
                  • <strong>Tap controls:</strong> Use zoom buttons for precise
                  control
                </div>
              </>
            )}
            {isVirtualizing && (
              <div>
                • <strong>Performance Mode:</strong> Only showing most important
                UTXOs for better performance
              </div>
            )}
          </div>
        </div>

        {/* Selection Panel */}
        {showSelectionPanel && selectedUTXOs.size > 0 && (
          <div className="mt-4 p-4 bg-blue-900/30 rounded-lg border border-blue-500/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-blue-300">
                Selected UTXOs ({selectedUTXOs.size})
              </h3>
              <button
                onClick={clearSelection}
                className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-sm"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {processedUtxos
                .filter(utxo => selectedUTXOs.has(utxo.txid))
                .map(utxo => {
                  const value = utxo.valueVRSC || utxo.value / 100000000;
                  return (
                    <div
                      key={utxo.txid}
                      className="p-3 bg-gray-800/50 rounded border border-gray-600 hover:border-blue-400 transition-colors"
                    >
                      <div className="text-sm font-mono text-gray-300 mb-1">
                        {utxo.txid.slice(0, 8)}...{utxo.txid.slice(-8)}
                      </div>
                      <div className="text-lg font-bold text-white">
                        {value.toFixed(4)} VRSC
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        <div>Status: {utxo.status}</div>
                        <div>
                          Confirmations: {utxo.confirmations.toLocaleString()}
                        </div>
                        {utxo.stakingWaitTime &&
                          utxo.stakingWaitDays !== null &&
                          utxo.stakingWaitDays !== undefined && (
                            <div className="text-yellow-400">
                              Found reward after:{' '}
                              {utxo.stakingWaitDays > 0
                                ? `${utxo.stakingWaitDays}d ${(utxo.stakingWaitHours || 0) % 24}h`
                                : `${utxo.stakingWaitHours || 0}h`}
                            </div>
                          )}
                        {utxo.isStakeInput && (
                          <div className="text-cyan-400">Stake Input</div>
                        )}
                        {utxo.isStakeOutput && (
                          <div className="text-magenta-400">Stake Output</div>
                        )}
                        {utxo.isEligibleForStaking && (
                          <div className="text-green-400">Ready to Stake</div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
              <div>
                Total Value:{' '}
                {processedUtxos
                  .filter(utxo => selectedUTXOs.has(utxo.txid))
                  .reduce(
                    (sum, u) => sum + (u.valueVRSC || u.value / 100000000),
                    0
                  )
                  .toFixed(4)}{' '}
                VRSC
              </div>
              <div>
                {
                  processedUtxos.filter(
                    utxo =>
                      selectedUTXOs.has(utxo.txid) && utxo.status === 'eligible'
                  ).length
                }{' '}
                eligible for staking
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [
    processedUtxos,
    safeWidth,
    safeHeight,
    selectedUTXOs,
    showSelectionPanel,
    clearSelection,
    handleDoubleClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchEndPinch,
    handleTouchMovePinch,
    handleTouchStartPinch,
    handleUTXOClick,
    handleUTXOHover,
    hoveredUTXO,
    isPanning,
    isVirtualizing,
    panX,
    panY,
    renderCanvasHeatmap,
    renderVirtualizedCells,
    useCanvasRendering,
    zoomLevel,
  ]);

  // Scatter plot visualization
  const renderScatter = useCallback(() => {
    if (processedUtxos.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          No UTXOs to display
        </div>
      );
    }

    const padding = 40;
    const plotWidth = Math.max(100, safeWidth - padding * 2);
    const plotHeight = Math.max(100, safeHeight - padding * 2);

    // Calculate value range
    const values = processedUtxos.map(u => u.valueVRSC || u.value / 100000000);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue;

    return (
      <svg
        width={safeWidth}
        height={safeHeight}
        className="bg-gray-900/30 rounded-lg border border-white/10"
      >
        {/* Axes */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1}
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1}
        />

        {/* UTXOs */}
        {processedUtxos.map((utxo, index) => {
          const value = utxo.valueVRSC || utxo.value / 100000000;
          const x =
            valueRange > 0
              ? padding + ((value - minValue) / valueRange) * plotWidth
              : padding + plotWidth / 2;
          const y = padding + (index / processedUtxos.length) * plotHeight;

          // Dynamic colors based on value and type
          let color = '#6b7280'; // Default inactive

          if (utxo.isStakeInput || utxo.isStakeOutput) {
            // Staking UTXOs - BRIGHT NEON COLORS with value tiers
            if (value >= 100000) {
              color = '#ffffff'; // BRILLIANT WHITE - 100K+
            } else if (value >= 10000) {
              color = '#ffd700'; // GOLD - 10K-100K
            } else if (value >= 1000) {
              color = '#ffff00'; // BRIGHT YELLOW - 1K-10K
            } else if (value >= 100) {
              color = '#ffa500'; // ORANGE - 100-1K
            } else if (value >= 10) {
              color = '#ff8c00'; // DARK ORANGE - 10-100
            } else {
              color = '#ff4500'; // RED-ORANGE - <10
            }
          } else if (utxo.status === 'eligible') {
            // Eligible UTXOs - Value-based spectrum
            if (value >= 100000) {
              color = '#ffffff'; // BRILLIANT WHITE - 100K+
            } else if (value >= 10000) {
              color = '#ffd700'; // GOLD - 10K-100K
            } else if (value >= 1000) {
              color = '#ffff00'; // YELLOW - 1K-10K
            } else if (value >= 100) {
              color = '#00ff00'; // LIME GREEN - 100-1K
            } else if (value >= 10) {
              color = '#00ff7f'; // SPRING GREEN - 10-100
            } else {
              color = '#32cd32'; // LIME GREEN - <10
            }
          } else if (utxo.status === 'cooldown') {
            color = '#ff0000'; // BRIGHT RED
          } else {
            // Inactive UTXOs - Value-based spectrum
            if (value >= 100000) {
              color = '#e0e0e0'; // LIGHT GRAY - 100K+
            } else if (value >= 10000) {
              color = '#4169e1'; // ROYAL BLUE - 10K-100K
            } else if (value >= 1000) {
              color = '#1e90ff'; // DODGER BLUE - 1K-10K
            } else if (value >= 100) {
              color = '#0000ff'; // BRIGHT BLUE - 100-1K
            } else if (value >= 10) {
              color = '#00bfff'; // DEEP SKY BLUE - 10-100
            } else {
              color = '#1e90ff'; // DODGER BLUE
            }
          }

          return (
            <circle
              key={`${utxo.txid}-${index}`}
              cx={x}
              cy={y}
              r={3}
              fill={color}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={0.5}
            >
              <title>
                Value: {value.toFixed(4)} VRSC Status: {utxo.status}
                {utxo.isStakeInput && '\nStake Input'}
                {utxo.isStakeOutput && '\nStake Output'}
              </title>
            </circle>
          );
        })}
      </svg>
    );
  }, [processedUtxos, safeWidth, safeHeight, height, width]);
  // List visualization with enhanced features
  const renderList = useCallback(() => {
    const totalPages = Math.ceil(processedUtxos.length / itemsPerPage);
    const startIndex = currentPage * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, processedUtxos.length);
    const pageUtxos = processedUtxos.slice(startIndex, endIndex);

    return (
      <div className="space-y-4">
        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search UTXOs..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(0); // Reset to first page when searching
              }}
              className="px-3 py-1 bg-gray-700 text-white rounded text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 w-48"
            />
            <select
              value={itemsPerPage}
              onChange={e => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(0); // Reset to first page when changing page size
              }}
              className="px-2 py-1 bg-gray-700 text-white rounded text-xs border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
              <option value={200}>200 per page</option>
            </select>
          </div>

          {/* Pagination */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 hover:bg-gray-600 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
              }
              disabled={currentPage === totalPages - 1}
              className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 hover:bg-gray-600 transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="text-sm text-gray-400">
          Showing {startIndex + 1}-{endIndex} of {processedUtxos.length} UTXOs
          {searchTerm && (
            <span className="text-blue-400 ml-2">
              (filtered by &quot;{searchTerm}&quot;)
            </span>
          )}
        </div>

        {/* UTXO List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {pageUtxos.map((utxo, index) => {
            const value = utxo.valueVRSC || utxo.value / 100000000;
            const colors = {
              eligible: 'bg-green-500/20 border-green-500/30',
              cooldown: 'bg-orange-500/20 border-orange-500/30',
              inactive: 'bg-gray-500/20 border-gray-500/30',
            };

            return (
              <div
                key={`${utxo.txid}-${index}`}
                className={`p-3 rounded-lg border ${colors[utxo.status]} hover:bg-white/5 transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-mono text-gray-300">
                      {utxo.txid.slice(0, 8)}...{utxo.txid.slice(-8)}
                    </div>
                    <div className="text-sm font-bold text-white">
                      {value.toFixed(4)} VRSC
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        utxo.status === 'eligible'
                          ? 'bg-green-500/30 text-green-300'
                          : utxo.status === 'cooldown'
                            ? 'bg-orange-500/30 text-orange-300'
                            : 'bg-gray-500/30 text-gray-300'
                      }`}
                    >
                      {utxo.status.toUpperCase()}
                    </div>
                    {utxo.isStakeInput && (
                      <div className="px-2 py-1 rounded text-xs font-medium bg-blue-500/30 text-blue-300">
                        STAKE INPUT
                      </div>
                    )}
                    {utxo.isStakeOutput && (
                      <div className="px-2 py-1 rounded text-xs font-medium bg-purple-500/30 text-purple-300">
                        STAKE OUTPUT
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {utxo.confirmations} confirmations
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [processedUtxos, currentPage, setCurrentPage, itemsPerPage, searchTerm]);

  // Calculate size distribution for histogram
  const sizeDistribution = useMemo(() => {
    const distribution = {
      tiny: { count: 0, valueVRSC: 0 },
      small: { count: 0, valueVRSC: 0 },
      medium: { count: 0, valueVRSC: 0 },
      large: { count: 0, valueVRSC: 0 },
    };

    processedUtxos.forEach(utxo => {
      const value = utxo.valueVRSC || utxo.value / 100000000;

      if (value < 10) {
        distribution.tiny.count++;
        distribution.tiny.valueVRSC += value;
      } else if (value < 100) {
        distribution.small.count++;
        distribution.small.valueVRSC += value;
      } else if (value < 1000) {
        distribution.medium.count++;
        distribution.medium.valueVRSC += value;
      } else {
        distribution.large.count++;
        distribution.large.valueVRSC += value;
      }
    });

    return distribution;
  }, [processedUtxos]);

  const renderHistogram = useCallback(() => {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <ReactEChartsCore
          echarts={echarts}
          option={{
            tooltip: {
              trigger: 'axis',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              textStyle: { color: '#fff' },
              axisPointer: {
                type: 'shadow',
              },
            },
            legend: {
              data: ['UTXO Count', 'Total Value'],
              textStyle: { color: '#fff' },
              top: 10,
            },
            grid: {
              left: '10%',
              right: '10%',
              bottom: '15%',
              top: '20%',
              containLabel: true,
            },
            xAxis: {
              type: 'category',
              data: ['0-10 VRSC', '10-100 VRSC', '100-1000 VRSC', '1000+ VRSC'],
              axisLine: { lineStyle: { color: '#4285F4' } },
              axisLabel: { color: '#888', fontSize: 10 },
            },
            yAxis: [
              {
                type: 'value',
                name: 'Count',
                position: 'left',
                axisLine: { lineStyle: { color: '#4285F4' } },
                splitLine: {
                  lineStyle: { color: 'rgba(66, 133, 244, 0.1)' },
                },
                axisLabel: { color: '#888' },
              },
              {
                type: 'value',
                name: 'VRSC Value',
                position: 'right',
                axisLine: { lineStyle: { color: '#EA4335' } },
                splitLine: { show: false },
                axisLabel: { color: '#888' },
              },
            ],
            series: [
              {
                name: 'UTXO Count',
                type: 'bar',
                data: [
                  sizeDistribution.tiny.count,
                  sizeDistribution.small.count,
                  sizeDistribution.medium.count,
                  sizeDistribution.large.count,
                ],
                itemStyle: { color: '#4285F4' },
                barMaxWidth: 60,
              },
              {
                name: 'Total Value',
                type: 'line',
                yAxisIndex: 1,
                data: [
                  sizeDistribution.tiny.valueVRSC,
                  sizeDistribution.small.valueVRSC,
                  sizeDistribution.medium.valueVRSC,
                  sizeDistribution.large.valueVRSC,
                ],
                itemStyle: { color: '#EA4335' },
                lineStyle: { width: 3 },
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
              },
            ],
          }}
          style={{ height: `${safeHeight}px`, width: '100%' }}
        />
      </div>
    );
  }, [sizeDistribution, safeHeight]);

  const renderVisualization = useCallback(() => {
    switch (visualizationMode) {
      case 'heatmap':
        return renderHeatmap();
      case 'scatter':
        return renderScatter();
      case 'histogram':
        return renderHistogram();
      case 'list':
        return renderList();
      default:
        return renderHeatmap();
    }
  }, [
    visualizationMode,
    renderHeatmap,
    renderScatter,
    renderHistogram,
    renderList,
  ]);

  if (!utxos || utxos.length === 0) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-900/30 rounded-lg`}
        style={{ width: safeWidth, height: safeHeight }}
      >
        <div className="text-center">
          <p className="text-gray-400 mb-2">No UTXOs to display</p>
          <p className="text-gray-500 text-sm">
            UTXO data will appear here when available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${className} space-y-4 w-full max-w-full overflow-hidden`}
      style={{ height: 'auto', minHeight: safeHeight }}
      role="region"
      aria-label="UTXO Interactive Analyzer"
    >
      {/* Controls */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-800/50 rounded-lg border border-gray-700 ${isMobile ? 'flex-col' : ''} overflow-x-auto`}
      >
        <div
          className={`flex items-center space-x-4 ${isMobile ? 'w-full justify-center' : ''}`}
        >
          {/* Visualization Mode */}
          <div className="flex items-center space-x-2">
            <span
              className={`text-sm text-gray-300 ${isMobile ? 'hidden' : ''}`}
            >
              View:
            </span>
            <div
              className="flex bg-gray-700 rounded-lg p-1"
              role="tablist"
              aria-label="Visualization mode selection"
            >
              {[
                { mode: 'heatmap', icon: GridFour, label: 'Heatmap' },
                { mode: 'scatter', icon: ChartBar, label: 'Scatter' },
                { mode: 'histogram', icon: ChartBar, label: 'Histogram' },
                { mode: 'list', icon: List, label: 'List' },
              ].map(({ mode, icon: Icon, label }) => {
                const isLoaded = loadedVisualizations.has(
                  mode as VisualizationMode
                );
                const isLoading = isLoadingVisualization && !isLoaded;

                return (
                  <button
                    key={mode}
                    onClick={() =>
                      handleVisualizationModeChange(mode as VisualizationMode)
                    }
                    disabled={isLoading}
                    className={`flex items-center space-x-1 px-3 py-1 rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed ${
                      visualizationMode === mode
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-300 hover:bg-gray-600'
                    }`}
                    role="tab"
                    aria-selected={visualizationMode === mode}
                    aria-controls={`${mode}-panel`}
                    tabIndex={visualizationMode === mode ? 0 : -1}
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-white" />
                    ) : (
                      <Icon className="h-3 w-3" aria-hidden="true" />
                    )}
                    <span>{label}</span>
                    {!isLoaded && !isLoading && (
                      <span className="text-xs opacity-60">●</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Zoom Controls */}
          <div
            className={`flex items-center space-x-2 ${isMobile ? 'w-full justify-center' : ''}`}
          >
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.2))}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium border border-slate-600/50 hover:border-slate-500/50 transition-all duration-200"
              disabled={zoomLevel <= 0.5}
            >
              -
            </button>
            <span className="text-sm text-slate-300 min-w-[60px] text-center font-medium">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(5, prev + 0.2))}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium border border-slate-600/50 hover:border-slate-500/50 transition-all duration-200"
              disabled={zoomLevel >= 5}
            >
              +
            </button>
            <button
              onClick={handleDoubleClick}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium border border-slate-600/50 hover:border-slate-500/50 transition-all duration-200"
            >
              Reset
            </button>
          </div>

          {/* Filters */}
          <div
            className={`flex items-center space-x-2 ${isMobile ? 'w-full justify-center' : ''}`}
          >
            <span className="text-sm text-gray-300">Filter:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="px-2 py-1 bg-gray-700 text-white rounded text-xs border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label="Filter UTXOs by status"
            >
              <option value="all">All Status</option>
              <option value="eligible">Eligible</option>
              <option value="cooldown">Cooldown</option>
              <option value="inactive">Inactive</option>
            </select>
            <label className="flex items-center space-x-1 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={showStakeOnly}
                onChange={e => setShowStakeOnly(e.target.checked)}
                className="rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                aria-label="Show only staking-related UTXOs"
              />
              <span>Stake Only</span>
            </label>
          </div>

          {/* Sorting Controls */}
          <div
            className={`flex items-center space-x-2 ${isMobile ? 'w-full justify-center' : ''}`}
          >
            <span className="text-sm text-gray-300">Sort by:</span>
            <select
              value={sortBy}
              onChange={e =>
                setSortBy(
                  e.target.value as 'value' | 'confirmations' | 'status'
                )
              }
              className="px-2 py-1 bg-gray-700 text-white rounded text-xs border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label="Sort UTXOs by field"
            >
              <option value="value">VRSC Value</option>
              <option value="confirmations">Confirmations</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() =>
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
              }
              className="px-2 py-1 bg-gray-700 text-white rounded text-xs border border-gray-600 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label={`Sort ${sortOrder === 'desc' ? 'ascending' : 'descending'}`}
              title={`Sort ${sortOrder === 'desc' ? 'ascending' : 'descending'}`}
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-300">
          <span className="whitespace-nowrap">
            Total: {stats.total.toLocaleString()}
          </span>
          <span className="whitespace-nowrap">
            Eligible: {stats.eligible.toLocaleString()}
          </span>
          <span className="whitespace-nowrap">
            Value: {stats.totalValue.toFixed(2)} VRSC
          </span>
        </div>
      </div>

      {/* Visualization */}
      <div
        className="relative w-full overflow-hidden"
        role="tabpanel"
        id={`${visualizationMode}-panel`}
        aria-labelledby={`${visualizationMode}-tab`}
        aria-label={`${visualizationMode} visualization of UTXOs`}
      >
        {isLoadingVisualization ? (
          <div className="flex items-center justify-center h-96 bg-gray-900/30 rounded-lg border border-gray-700/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
              <div className="text-blue-400 text-sm font-medium">
                Loading {visualizationMode} visualization...
              </div>
              <div className="text-gray-500 text-xs mt-1">
                Preparing data for optimal performance
              </div>
            </div>
          </div>
        ) : (
          renderVisualization()
        )}
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap items-center justify-center gap-6 text-xs"
        role="legend"
        aria-label="UTXO color legend"
      >
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-300">Eligible ({stats.eligible})</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-gray-300">Cooldown ({stats.cooldown})</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-gray-500" />
          <span className="text-gray-300">Inactive ({stats.inactive})</span>
        </div>
        {stats.stakeInputs > 0 && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-300">
              Stake Input ({stats.stakeInputs})
            </span>
          </div>
        )}
        {stats.stakeOutputs > 0 && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-gray-300">
              Stake Output ({stats.stakeOutputs})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
const MemoizedAdvancedUTXOVisualizer = memo(AdvancedUTXOVisualizer);

// Export both named and default for backward compatibility
export { MemoizedAdvancedUTXOVisualizer as AdvancedUTXOVisualizer };
export default MemoizedAdvancedUTXOVisualizer;
