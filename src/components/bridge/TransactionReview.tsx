// Transaction Review Component - Transaction review and confirmation
// Adapted from Hyperlane ReviewDetails with shadcn/ui components

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, ExternalLink } from 'lucide-react';
import { useBridgeContext } from '@/hooks/bridge/useBridgeContext';
import { useTokenApproval } from '@/hooks/bridge/useTokenApproval';
import { bridgeHelpers } from '@/utils/bridge/bridgeHelpers';
import { BridgeFormValues } from './BridgeForm';
import { BridgeFees } from '@/hooks/bridge/useFeeQuotes';

interface TransactionReviewProps {
  formValues: BridgeFormValues;
  fees: BridgeFees | null;
  isLoading: boolean;
  lastUpdated?: number;
  onRefreshFees?: () => void;
}

export function TransactionReview({
  formValues,
  fees,
  isLoading,
  lastUpdated,
  onRefreshFees
}: TransactionReviewProps) {
  const { warpCore } = useBridgeContext();

  // Get token information
  const token = formValues.tokenIndex !== null && warpCore?.tokens
    ? warpCore.tokens[formValues.tokenIndex]
    : null;

  const destinationToken = token?.getConnectionForChain(formValues.destinationChain)?.token;

  // Check if token approval is required
  const { isApproveRequired, isLoading: isApprovalLoading } = useTokenApproval({
    tokenIndex: formValues.tokenIndex,
    amount: formValues.amount,
    enabled: !isLoading && !!token && !!formValues.amount
  });

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Transaction Details</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading transaction details...
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Transfer Summary */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Transfer Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From:</span>
                  <span>{bridgeHelpers.getChainDisplayName(formValues.originChain)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To:</span>
                  <span>{bridgeHelpers.getChainDisplayName(formValues.destinationChain)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token:</span>
                  <span>{token?.symbol || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span>{formValues.amount} {token?.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipient:</span>
                  <span className="font-mono text-xs">
                    {bridgeHelpers.truncateAddress(formValues.recipient)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Token Addresses */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Token Addresses</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Origin Token:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs">
                      {bridgeHelpers.truncateAddress(token?.addressOrDenom || '')}
                    </span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
                {destinationToken?.addressOrDenom && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Destination Token:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">
                        {bridgeHelpers.truncateAddress(destinationToken.addressOrDenom)}
                      </span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Transaction Steps */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Transaction Steps</h4>
              <div className="space-y-2 text-sm">
                {isApprovalLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-muted-foreground">Checking approval requirements...</span>
                  </div>
                ) : (
                  <>
                    {isApproveRequired && (
                      <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <div className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                          1
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-blue-900">Approve Token Transfer</div>
                          <div className="text-xs text-blue-700 mt-1">
                            Approve {token?.symbol} for bridge contract
                          </div>
                          {token?.collateralAddressOrDenom && (
                            <div className="text-xs text-blue-600 mt-1 font-mono">
                              Token: {bridgeHelpers.truncateAddress(token.collateralAddressOrDenom)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2 p-2 bg-green-50 border border-green-200 rounded">
                      <div className="flex-shrink-0 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                        {isApproveRequired ? '2' : '1'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-green-900">Execute Bridge Transfer</div>
                        <div className="text-xs text-green-700 mt-1">
                          Transfer {formValues.amount} {token?.symbol} to {bridgeHelpers.getChainDisplayName(formValues.destinationChain)}
                        </div>
                        <div className="text-xs text-green-600 mt-1 font-mono">
                          To: {bridgeHelpers.truncateAddress(formValues.recipient)}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Fee Breakdown */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Fee Breakdown</h4>
              <div className="space-y-1 text-sm">
                {fees?.localQuote && fees.localQuote.amount > 0n && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Local Gas (est.):</span>
                    <span>
                      {bridgeHelpers.formatTokenAmount(fees.localQuote)} {fees.localQuote.token.symbol}
                    </span>
                  </div>
                )}
                {fees?.interchainQuote && fees.interchainQuote.amount > 0n && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Interchain Gas:</span>
                    <span>
                      {bridgeHelpers.formatTokenAmount(fees.interchainQuote)} {fees.interchainQuote.token.symbol}
                    </span>
                  </div>
                )}
                {fees?.totalFee && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-medium">
                      <span>Total Fees:</span>
                      <span>
                        {bridgeHelpers.formatTokenAmount(fees.totalFee)} {fees.totalFee.token.symbol}
                      </span>
                    </div>
                  </>
                )}
                {!fees?.localQuote && !fees?.interchainQuote && (
                  <div className="text-center text-muted-foreground">
                    Fee information not available
                  </div>
                )}
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-sm font-medium mb-2">Important Notes</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {isApproveRequired && (
                  <li>• You will need to approve the token before the transfer can proceed</li>
                )}
                <li>• Cross-chain transfers may take several minutes to complete</li>
                <li>• Ensure the recipient address is correct for the destination chain</li>
                <li>• Gas fees are estimates and may vary</li>
                <li>• This transaction cannot be reversed once confirmed</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
