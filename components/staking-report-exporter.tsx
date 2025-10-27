'use client';

import { useState } from 'react';
import {
  DownloadSimple,
  FileText,
  Table,
  Calculator,
  ShareNetwork,
  X,
} from '@phosphor-icons/react';

interface ExportData {
  friendlyName: string;
  summary: any;
  monthlyData: any[];
  dailyData: any[];
  utxoHealth: any;
  rankings: any;
}

interface StakingReportExporterProps {
  data: ExportData;
  iaddr: string;
}

export function StakingReportExporter({
  data,
  iaddr,
}: StakingReportExporterProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportToCSV = () => {
    setExporting(true);
    try {
      // Create CSV content
      const headers = ['Date', 'Stakes', 'Total Rewards (VRSC)', 'APY (%)'];
      const rows = data.monthlyData.map((m: any) => [
        new Date(m.month).toLocaleDateString(),
        m.stakeCount,
        m.totalRewardsVRSC.toFixed(2),
        (m.apy || 0).toFixed(2),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');

      // DownloadSimple file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.friendlyName || iaddr}_staking_report.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowExportMenu(false);
    } catch (error) {
      alert('Failed to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const exportTaxReport = () => {
    setExporting(true);
    try {
      // Create detailed tax report
      const headers = [
        'Date',
        'Transaction Type',
        'Amount (VRSC)',
        'Value (USD)',
        'Notes',
      ];
      const rows = data.monthlyData.map((m: any) => [
        new Date(m.month).toLocaleDateString(),
        'Staking Reward',
        m.totalRewardsVRSC.toFixed(8),
        'N/A', // Would need price data
        `${m.stakeCount} stakes this month`,
      ]);

      const csvContent = [
        '# VERUS STAKING TAX REPORT',
        `# Generated: ${new Date().toLocaleString()}`,
        `# Identity: ${data.friendlyName || iaddr}`,
        `# Total Rewards: ${data.summary.totalRewardsVRSC.toFixed(2)} VRSC`,
        `# Total Stakes: ${data.summary.totalStakes}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(',')),
        '',
        '# DISCLAIMER: This report is for informational purposes only.',
        '# Please consult a tax professional for tax advice.',
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.friendlyName || iaddr}_tax_report.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowExportMenu(false);
    } catch (error) {
      alert('Failed to export tax report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = () => {
    alert(
      'PDF export is coming soon! For now, please use CSV export or print this page as PDF from your browser.'
    );
    setShowExportMenu(false);
  };

  const generateShareLink = () => {
    const url = `${window.location.origin}/verusid?search=${encodeURIComponent(data.friendlyName || iaddr)}`;
    navigator.clipboard.writeText(url);
    alert('Share link copied to clipboard!');
    setShowExportMenu(false);
  };

  return (
    <div className="relative">
      {/* Export Button */}
      <button
        onClick={() => setShowExportMenu(!showExportMenu)}
        className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-verus-blue/20 to-verus-green/20 hover:from-verus-blue/30 hover:to-verus-green/30 text-white rounded-xl border border-verus-blue/30 hover:border-verus-blue/50 transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm"
        disabled={exporting}
      >
        <DownloadSimple className="h-4 w-4" />
        <span className="text-sm sm:text-base font-medium">
          {exporting ? 'Exporting...' : 'Export Data'}
        </span>
      </button>

      {/* Export Menu */}
      {showExportMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowExportMenu(false)}
          ></div>

          {/* Menu */}
          <div className="absolute top-full right-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-verus-blue/20 to-verus-green/20 border-b border-slate-700 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DownloadSimple className="h-5 w-5 text-verus-blue" />
                <span className="font-semibold text-white">Export Options</span>
              </div>
              <button
                onClick={() => setShowExportMenu(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Options */}
            <div className="p-3 space-y-2">
              <button
                onClick={exportToCSV}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-white/10 rounded-xl transition-all duration-200 text-left group border border-transparent hover:border-green-500/30"
                disabled={exporting}
              >
                <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                  <Table className="h-5 w-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium">CSV Export</div>
                  <div className="text-xs text-slate-400">
                    Monthly staking data
                  </div>
                </div>
              </button>

              <button
                onClick={exportTaxReport}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-white/10 rounded-xl transition-all duration-200 text-left group border border-transparent hover:border-verus-teal/30"
                disabled={exporting}
              >
                <div className="p-2 bg-verus-teal/20 rounded-lg group-hover:bg-verus-teal/30 transition-colors">
                  <Calculator className="h-5 w-5 text-verus-teal" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium">Tax Report</div>
                  <div className="text-xs text-slate-400">For tax purposes</div>
                </div>
              </button>

              <button
                onClick={exportToPDF}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-white/10 rounded-xl transition-all duration-200 text-left group border border-transparent hover:border-red-500/30"
                disabled={exporting}
              >
                <div className="p-2 bg-red-500/20 rounded-lg group-hover:bg-red-500/30 transition-colors">
                  <FileText className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium">PDF Report</div>
                  <div className="text-xs text-slate-400">Coming soon</div>
                </div>
              </button>

              <div className="border-t border-slate-700 my-3"></div>

              <button
                onClick={generateShareLink}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-white/10 rounded-xl transition-all duration-200 text-left group border border-transparent hover:border-verus-blue/30"
              >
                <div className="p-2 bg-verus-blue/20 rounded-lg group-hover:bg-verus-blue/30 transition-colors">
                  <ShareNetwork className="h-5 w-5 text-verus-blue" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium">Share Link</div>
                  <div className="text-xs text-slate-400">
                    Copy link to clipboard
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="bg-slate-800/50 border-t border-slate-700 p-3">
              <p className="text-xs text-slate-400 text-center">
                Export your staking data for analysis or tax purposes
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
