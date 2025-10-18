// Search Models and Types for Verus Explorer

export interface SearchHistory {
  id?: number;
  searchQuery: string;
  searchType: 'verusid' | 'address' | 'transaction' | 'block' | 'auto';
  resultFound: boolean;
  resultData?: any; // JSON data of the search result
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VerusIDSearch {
  id?: number;
  searchHistoryId?: number;
  verusID: string;
  identityAddress?: string;
  primaryAddresses?: string[];
  friendlyName?: string;
  fullyQualifiedName?: string;
  parent?: string;
  minimumSignatures?: number;
  canRevoke?: boolean;
  privateAddress?: string;
  contentMap?: any; // JSON object
  revocationAuthority?: string;
  recoveryAuthority?: string;
  timeLock?: number;
  flags?: number;
  version?: number;
  txid?: string;
  height?: number;
  status?: string;
  blockHeight?: number;
  hasHistory?: boolean;
  historyAvailable?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SearchAnalytics {
  id?: number;
  searchType: string;
  totalSearches: number;
  successfulSearches: number;
  failedSearches: number;
  uniqueUsers: number;
  averageResponseTime: number; // milliseconds
  date: Date; // Date for daily analytics
  createdAt?: Date;
  updatedAt?: Date;
}
