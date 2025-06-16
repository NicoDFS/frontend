// Bridge Validation Functions - Validation utilities for bridge operations
// This file contains validation functions adapted from Hyperlane bridge UI

import { isAddress } from 'viem';
import { bridgeConfig } from '../../config/bridge/config';

export const bridgeValidation = {
  // Validate transfer form data
  validateTransferForm: (values: {
    originChain: string;
    destinationChain: string;
    tokenIndex: number | null;
    amount: string;
    recipient: string;
  }) => {
    const errors: Record<string, string> = {};

    if (!values.originChain) {
      errors.originChain = 'Origin chain is required';
    } else if (!bridgeConfig.supportedChains.includes(values.originChain)) {
      errors.originChain = 'Unsupported origin chain';
    }

    if (!values.destinationChain) {
      errors.destinationChain = 'Destination chain is required';
    } else if (!bridgeConfig.supportedChains.includes(values.destinationChain)) {
      errors.destinationChain = 'Unsupported destination chain';
    } else if (values.originChain === values.destinationChain) {
      errors.destinationChain = 'Destination chain must be different from origin chain';
    }

    if (values.tokenIndex === null) {
      errors.tokenIndex = 'Token selection is required';
    }

    if (!bridgeValidation.validateAmount(values.amount)) {
      errors.amount = 'Invalid amount';
    }

    if (!bridgeValidation.validateRecipientAddress(values.recipient)) {
      errors.recipient = 'Invalid recipient address';
    }

    return errors;
  },

  // Validate amount string
  validateAmount: (amount: string): boolean => {
    if (!amount || amount.trim() === '') return false;

    const num = Number(amount);
    if (isNaN(num) || !isFinite(num)) return false;
    if (num <= 0) return false;

    // Check for reasonable decimal places (max 18)
    const decimalPlaces = amount.split('.')[1]?.length || 0;
    if (decimalPlaces > 18) return false;

    return true;
  },

  // Validate recipient address
  validateRecipientAddress: (address: string): boolean => {
    if (!address || address.trim() === '') return false;
    return isAddress(address);
  },

  // Validate chain selection
  validateChainSelection: (originChain: string, destinationChain: string): boolean => {
    if (!originChain || !destinationChain) return false;
    if (originChain === destinationChain) return false;

    return (
      bridgeConfig.supportedChains.includes(originChain) &&
      bridgeConfig.supportedChains.includes(destinationChain)
    );
  },

  // Validate token index
  validateTokenIndex: (tokenIndex: number | null, maxTokens: number): boolean => {
    if (tokenIndex === null) return false;
    return tokenIndex >= 0 && tokenIndex < maxTokens;
  },

  // Check if amount exceeds balance
  validateAmountAgainstBalance: (amount: string, balance: string): boolean => {
    try {
      const amountNum = Number(amount);
      const balanceNum = Number(balance);
      return amountNum <= balanceNum;
    } catch {
      return false;
    }
  },

  // Validate minimum transfer amount
  validateMinimumAmount: (amount: string, minimumAmount: string = '0.000001'): boolean => {
    try {
      const amountNum = Number(amount);
      const minNum = Number(minimumAmount);
      return amountNum >= minNum;
    } catch {
      return false;
    }
  },

  // Check for common error patterns
  checkCommonErrors: (values: {
    originChain: string;
    destinationChain: string;
    amount: string;
    recipient: string;
  }): string | null => {
    // Check for zero address
    if (values.recipient === '0x0000000000000000000000000000000000000000') {
      return 'Cannot send to zero address';
    }

    // Check for very small amounts that might fail
    if (values.amount && Number(values.amount) < 0.000001) {
      return 'Amount too small for transfer';
    }

    // Check for very large amounts that might be typos
    if (values.amount && Number(values.amount) > 1000000) {
      return 'Amount seems unusually large, please verify';
    }

    return null;
  },

  // Sanitize input values
  sanitizeAmount: (amount: string): string => {
    // Remove any non-numeric characters except decimal point
    const sanitized = amount.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }

    return sanitized;
  },

  // Sanitize address input
  sanitizeAddress: (address: string): string => {
    return address.trim().toLowerCase();
  },
};
