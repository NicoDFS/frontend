'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertTriangle, 
  AlertCircle, 
  XCircle, 
  Info, 
  RefreshCw, 
  Settings, 
  ChevronDown, 
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { SwapError, SwapErrorSeverity } from '@/utils/swapErrors';

interface ErrorDisplayProps {
  error: SwapError;
  onRetry?: () => void;
  onAdjust?: () => void;
  onReset?: () => void;
  onConnectWallet?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export default function ErrorDisplay({
  error,
  onRetry,
  onAdjust,
  onReset,
  onConnectWallet,
  isRetrying = false,
  className = ''
}: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Get severity-based styling
  const getSeverityStyles = (severity: SwapErrorSeverity) => {
    switch (severity) {
      case SwapErrorSeverity.LOW:
        return {
          containerClass: 'bg-blue-50 border-blue-200',
          iconClass: 'text-blue-600',
          titleClass: 'text-blue-900',
          messageClass: 'text-blue-800',
          icon: Info
        };
      case SwapErrorSeverity.MEDIUM:
        return {
          containerClass: 'bg-yellow-50 border-yellow-200',
          iconClass: 'text-yellow-600',
          titleClass: 'text-yellow-900',
          messageClass: 'text-yellow-800',
          icon: AlertTriangle
        };
      case SwapErrorSeverity.HIGH:
        return {
          containerClass: 'bg-orange-50 border-orange-200',
          iconClass: 'text-orange-600',
          titleClass: 'text-orange-900',
          messageClass: 'text-orange-800',
          icon: AlertCircle
        };
      case SwapErrorSeverity.CRITICAL:
        return {
          containerClass: 'bg-red-50 border-red-200',
          iconClass: 'text-red-600',
          titleClass: 'text-red-900',
          messageClass: 'text-red-800',
          icon: XCircle
        };
      default:
        return {
          containerClass: 'bg-gray-50 border-gray-200',
          iconClass: 'text-gray-600',
          titleClass: 'text-gray-900',
          messageClass: 'text-gray-800',
          icon: AlertCircle
        };
    }
  };

  const styles = getSeverityStyles(error.severity);
  const IconComponent = styles.icon;

  // Handle action button clicks
  const handleAction = () => {
    switch (error.actionType) {
      case 'retry':
        onRetry?.();
        break;
      case 'adjust':
        onAdjust?.();
        break;
      case 'reset':
        onReset?.();
        break;
      case 'external':
        onConnectWallet?.();
        break;
    }
  };

  return (
    <Card className={`border ${styles.containerClass} ${className}`}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <IconComponent className={`h-5 w-5 ${styles.iconClass} mt-0.5 flex-shrink-0`} />
          
          <div className="flex-1 min-w-0">
            {/* Error Title */}
            <h4 className={`font-medium ${styles.titleClass} mb-1`}>
              {error.title}
            </h4>
            
            {/* Error Message */}
            <p className={`text-sm ${styles.messageClass} mb-3`}>
              {error.message}
            </p>
            
            {/* Suggestion */}
            {error.suggestion && (
              <p className={`text-sm ${styles.messageClass} opacity-90 mb-3`}>
                💡 {error.suggestion}
              </p>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 mb-3">
              {error.actionLabel && (
                <Button
                  onClick={handleAction}
                  disabled={isRetrying}
                  size="sm"
                  variant={error.severity === SwapErrorSeverity.CRITICAL ? 'destructive' : 'default'}
                  className="h-8"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      {error.actionType === 'retry' && <RefreshCw className="h-3 w-3 mr-1" />}
                      {error.actionType === 'adjust' && <Settings className="h-3 w-3 mr-1" />}
                      {error.actionType === 'external' && <ExternalLink className="h-3 w-3 mr-1" />}
                      {error.actionLabel}
                    </>
                  )}
                </Button>
              )}
              
              {/* Reset button for critical errors */}
              {error.severity === SwapErrorSeverity.CRITICAL && onReset && (
                <Button
                  onClick={onReset}
                  size="sm"
                  variant="outline"
                  className="h-8"
                >
                  Reset Form
                </Button>
              )}
            </div>
            
            {/* Error Details Toggle */}
            {error.details && (
              <div>
                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  variant="ghost"
                  size="sm"
                  className={`h-6 p-0 ${styles.messageClass} hover:bg-transparent`}
                >
                  {showDetails ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show Details
                    </>
                  )}
                </Button>
                
                {showDetails && (
                  <div className={`mt-2 p-2 bg-white bg-opacity-50 rounded text-xs font-mono ${styles.messageClass} break-all`}>
                    {error.details}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact error display for inline use
 */
export function CompactErrorDisplay({
  error,
  onRetry,
  isRetrying = false,
  className = ''
}: {
  error: SwapError;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}) {
  const styles = getSeverityStyles(error.severity);
  const IconComponent = styles.icon;

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border ${styles.containerClass} ${className}`}>
      <IconComponent className={`h-4 w-4 ${styles.iconClass} flex-shrink-0`} />
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${styles.titleClass}`}>
          {error.title}
        </p>
        <p className={`text-xs ${styles.messageClass} opacity-90`}>
          {error.message}
        </p>
      </div>
      
      {error.retryable && onRetry && (
        <Button
          onClick={onRetry}
          disabled={isRetrying}
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
}

// Helper function for severity styles (used by both components)
function getSeverityStyles(severity: SwapErrorSeverity) {
  switch (severity) {
    case SwapErrorSeverity.LOW:
      return {
        containerClass: 'bg-blue-50 border-blue-200',
        iconClass: 'text-blue-600',
        titleClass: 'text-blue-900',
        messageClass: 'text-blue-800',
        icon: Info
      };
    case SwapErrorSeverity.MEDIUM:
      return {
        containerClass: 'bg-yellow-50 border-yellow-200',
        iconClass: 'text-yellow-600',
        titleClass: 'text-yellow-900',
        messageClass: 'text-yellow-800',
        icon: AlertTriangle
      };
    case SwapErrorSeverity.HIGH:
      return {
        containerClass: 'bg-orange-50 border-orange-200',
        iconClass: 'text-orange-600',
        titleClass: 'text-orange-900',
        messageClass: 'text-orange-800',
        icon: AlertCircle
      };
    case SwapErrorSeverity.CRITICAL:
      return {
        containerClass: 'bg-red-50 border-red-200',
        iconClass: 'text-red-600',
        titleClass: 'text-red-900',
        messageClass: 'text-red-800',
        icon: XCircle
      };
    default:
      return {
        containerClass: 'bg-gray-50 border-gray-200',
        iconClass: 'text-gray-600',
        titleClass: 'text-gray-900',
        messageClass: 'text-gray-800',
        icon: AlertCircle
      };
  }
}
