'use client';

import React, { useState, useCallback, useRef } from 'react';
import { 
  SwapError, 
  SwapErrorType, 
  parseSwapError, 
  createValidationError, 
  isAutoRetryable, 
  getRetryDelay 
} from '@/utils/swapErrors';

interface UseSwapErrorHandlerOptions {
  maxRetries?: number;
  onRetrySuccess?: () => void;
  onRetryFailed?: (error: SwapError) => void;
  onValidationError?: (error: SwapError) => void;
}

interface SwapErrorState {
  error: SwapError | null;
  isRetrying: boolean;
  retryCount: number;
  canRetry: boolean;
}

export function useSwapErrorHandler(options: UseSwapErrorHandlerOptions = {}) {
  const {
    maxRetries = 3,
    onRetrySuccess,
    onRetryFailed,
    onValidationError
  } = options;

  const [errorState, setErrorState] = useState<SwapErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    canRetry: false
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRetryOperationRef = useRef<(() => Promise<void>) | null>(null);

  /**
   * Handle a new error
   */
  const handleError = useCallback((error: any) => {
    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    const parsedError = parseSwapError(error);
    const canRetry = parsedError.retryable && errorState.retryCount < maxRetries;

    setErrorState({
      error: parsedError,
      isRetrying: false,
      retryCount: 0, // Reset retry count for new errors
      canRetry
    });

    // Auto-retry for network errors
    if (isAutoRetryable(parsedError) && canRetry) {
      scheduleAutoRetry(parsedError);
    }

    return parsedError;
  }, [maxRetries, errorState.retryCount]);

  /**
   * Handle validation errors (pre-transaction)
   */
  const handleValidationError = useCallback((type: SwapErrorType, context?: any) => {
    const validationError = createValidationError(type, context);
    
    setErrorState({
      error: validationError,
      isRetrying: false,
      retryCount: 0,
      canRetry: false
    });

    onValidationError?.(validationError);
    return validationError;
  }, [onValidationError]);

  /**
   * Schedule automatic retry for network errors
   */
  const scheduleAutoRetry = useCallback((error: SwapError) => {
    if (!lastRetryOperationRef.current) return;

    const delay = getRetryDelay(errorState.retryCount);
    
    retryTimeoutRef.current = setTimeout(async () => {
      await performRetry();
    }, delay);
  }, [errorState.retryCount]);

  /**
   * Manually retry the last operation
   */
  const retry = useCallback(async () => {
    if (!errorState.canRetry || !lastRetryOperationRef.current) return;

    await performRetry();
  }, [errorState.canRetry]);

  /**
   * Perform the actual retry operation
   */
  const performRetry = useCallback(async () => {
    if (!lastRetryOperationRef.current || !errorState.error) return;

    setErrorState(prev => ({
      ...prev,
      isRetrying: true
    }));

    try {
      await lastRetryOperationRef.current();
      
      // Success - clear error
      setErrorState({
        error: null,
        isRetrying: false,
        retryCount: 0,
        canRetry: false
      });

      onRetrySuccess?.();
    } catch (retryError) {
      const newRetryCount = errorState.retryCount + 1;
      const parsedError = parseSwapError(retryError);
      const canRetryAgain = parsedError.retryable && newRetryCount < maxRetries;

      setErrorState({
        error: parsedError,
        isRetrying: false,
        retryCount: newRetryCount,
        canRetry: canRetryAgain
      });

      if (newRetryCount >= maxRetries) {
        onRetryFailed?.(parsedError);
      } else if (isAutoRetryable(parsedError) && canRetryAgain) {
        // Schedule another auto-retry
        scheduleAutoRetry(parsedError);
      }
    }
  }, [errorState.error, errorState.retryCount, maxRetries, onRetrySuccess, onRetryFailed, scheduleAutoRetry]);

  /**
   * Set the operation to retry
   */
  const setRetryOperation = useCallback((operation: () => Promise<void>) => {
    lastRetryOperationRef.current = operation;
  }, []);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      canRetry: false
    });

    lastRetryOperationRef.current = null;
  }, []);

  /**
   * Reset error state and form
   */
  const reset = useCallback(() => {
    clearError();
    // Additional reset logic can be added here
  }, [clearError]);

  /**
   * Validate swap parameters before execution
   */
  const validateSwap = useCallback((params: {
    isConnected: boolean;
    fromToken: any;
    toToken: any;
    fromAmount: string;
    balance?: string;
  }) => {
    const { isConnected, fromToken, toToken, fromAmount, balance } = params;

    // Check wallet connection
    if (!isConnected) {
      return handleValidationError(SwapErrorType.WALLET_NOT_CONNECTED);
    }

    // Check if tokens are selected
    if (!fromToken || !toToken) {
      return handleValidationError(SwapErrorType.INVALID_TOKEN);
    }

    // Check if same token
    if (fromToken.address === toToken.address) {
      return handleValidationError(SwapErrorType.SAME_TOKEN);
    }

    // Check amount validity
    if (!fromAmount || isNaN(parseFloat(fromAmount)) || parseFloat(fromAmount) <= 0) {
      return handleValidationError(SwapErrorType.INVALID_AMOUNT);
    }

    // Check balance if available
    if (balance && parseFloat(fromAmount) > parseFloat(balance)) {
      return handleValidationError(SwapErrorType.INSUFFICIENT_BALANCE, {
        required: fromAmount,
        available: balance,
        symbol: fromToken.symbol
      });
    }

    return null; // No validation errors
  }, [handleValidationError]);

  /**
   * Execute an operation with error handling
   */
  const executeWithErrorHandling = useCallback(async (
    operation: () => Promise<void>,
    options: { autoRetry?: boolean } = {}
  ) => {
    const { autoRetry = false } = options;

    // Clear previous errors
    clearError();

    // Set retry operation if auto-retry is enabled
    if (autoRetry) {
      setRetryOperation(operation);
    }

    try {
      await operation();
    } catch (error) {
      handleError(error);
      throw error; // Re-throw so caller can handle if needed
    }
  }, [clearError, setRetryOperation, handleError]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Error state
    error: errorState.error,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    canRetry: errorState.canRetry,
    hasError: !!errorState.error,

    // Error handling functions
    handleError,
    handleValidationError,
    clearError,
    reset,
    retry,
    validateSwap,
    executeWithErrorHandling,
    setRetryOperation
  };
}
