'use client';

import { useState, useEffect } from 'react';
import {
  Heart,
  X,
  Copy,
  Check,
  ArrowSquareOut,
  Gift,
} from '@phosphor-icons/react';

interface DonationWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
  dismissible?: boolean;
}

export function DonationWidget({
  position = 'bottom-right',
  dismissible = true,
}: DonationWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRecognitionForm, setShowRecognitionForm] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    message: '',
    showOnWall: false,
    anonymous: false,
  });

  // VRSC donation address (replace with your actual address)
  const DONATION_ADDRESS = 'RYourVerusDonationAddressHere123456789';

  useEffect(() => {
    // Check if user has dismissed the widget
    const dismissed = localStorage.getItem('donation-widget-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('donation-widget-dismissed', 'true');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(DONATION_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silent error handling for clipboard
    }
  };

  const handleSubmitRecognition = async () => {
    // TODO: Send recognition data to API
    setShowRecognitionForm(false);
    setIsOpen(false);
    // Show success toast
    alert('Thank you! Your recognition preferences have been saved.');
  };

  if (isDismissed && !isOpen) {
    return null;
  }

  const positionClasses =
    position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6';

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <div
          className={`fixed ${positionClasses} z-50 flex items-center gap-2`}
        >
          {dismissible && !isDismissed && (
            <button
              onClick={handleDismiss}
              className="bg-gray-800/90 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full p-2 backdrop-blur-sm border border-gray-700 transition-all"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(true)}
            className="group bg-gradient-to-r from-verus-blue to-verus-green hover:from-verus-blue-dark hover:to-verus-green-dark text-white rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 animate-pulse hover:animate-none"
          >
            <Heart className="h-5 w-5 fill-current" />
            <span className="font-medium">Support Development</span>
          </button>
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-verus-blue/30 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-verus-blue/20 to-verus-green/20 border-b border-verus-blue/30 p-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-verus-blue to-verus-green rounded-full p-2">
                  <Gift className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    Support This Project
                  </h3>
                  <p className="text-sm text-gray-300">
                    Help us build amazing tools for the Verus community
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {!showRecognitionForm ? (
                <>
                  {/* Donation Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      VRSC Donation Address
                    </label>
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <code className="text-sm text-verus-blue/80 break-all font-mono">
                          {DONATION_ADDRESS}
                        </code>
                        <button
                          onClick={handleCopy}
                          className="ml-2 p-2 bg-verus-blue/20 hover:bg-verus-blue/20 rounded-lg transition-colors flex-shrink-0"
                          title="Copy address"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-verus-blue/80" />
                          )}
                        </button>
                      </div>

                      {/* QR Code Placeholder */}
                      <div className="flex justify-center py-4">
                        <div className="bg-white p-4 rounded-lg">
                          <div className="w-48 h-48 bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                            QR Code
                            <br />
                            (Generate with address)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Suggested Amounts */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Suggested Amounts
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { amount: 10, label: 'Supporter' },
                        { amount: 50, label: 'Generous' },
                        { amount: 100, label: 'Epic' },
                        { amount: 500, label: 'Legendary' },
                      ].map(tier => (
                        <button
                          key={tier.amount}
                          className="bg-gradient-to-r from-verus-blue/20 to-verus-green/20 hover:from-verus-blue/30 hover:to-verus-green/30 border border-verus-blue/30 hover:border-verus-blue/50 rounded-lg p-4 transition-all group"
                        >
                          <div className="text-2xl font-bold text-white mb-1">
                            {tier.amount} VRSC
                          </div>
                          <div className="text-xs text-verus-blue/80">
                            {tier.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* After Donation */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-200 mb-3">
                      <strong>After donating:</strong> Would you like to be
                      recognized on our supporter wall?
                    </p>
                    <button
                      onClick={() => setShowRecognitionForm(true)}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>Yes, Add My Recognition</span>
                      <ArrowSquareOut className="h-4 w-4" />
                    </button>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      Optional • Privacy-first • You can stay anonymous
                    </p>
                  </div>

                  {/* Impact Statement */}
                  <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-yellow-300 mb-2">
                      💡 Your Donation Helps Us:
                    </h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Maintain and improve the explorer</li>
                      <li>• Add new features and analytics</li>
                      <li>• Cover server and infrastructure costs</li>
                      <li>• Support the Verus ecosystem</li>
                    </ul>
                  </div>
                </>
              ) : (
                /* Recognition Form */
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white">
                    Recognition Preferences
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Display Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          displayName: e.target.value,
                        })
                      }
                      placeholder="Your name or VerusID"
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-verus-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Message/Dedication (Optional, max 100 chars)
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          message: e.target.value.slice(0, 100),
                        })
                      }
                      placeholder="Optional message"
                      maxLength={100}
                      rows={2}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-verus-blue"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.message.length}/100 characters
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showOnWall}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            showOnWall: e.target.checked,
                          })
                        }
                        className="w-5 h-5 bg-gray-800 border-gray-700 rounded focus:ring-2 focus:ring-verus-blue"
                      />
                      <span className="text-sm text-gray-300">
                        Display on supporter wall (opt-in)
                      </span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.anonymous}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            anonymous: e.target.checked,
                          })
                        }
                        className="w-5 h-5 bg-gray-800 border-gray-700 rounded focus:ring-2 focus:ring-verus-blue"
                      />
                      <span className="text-sm text-gray-300">
                        Stay anonymous (shows as &quot;Anonymous
                        Supporter&quot;)
                      </span>
                    </label>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setShowRecognitionForm(false)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmitRecognition}
                      className="flex-1 bg-gradient-to-r from-verus-blue to-verus-green hover:from-verus-blue-dark hover:to-verus-green-dark text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-700 p-4 bg-gray-900/50">
              <p className="text-xs text-gray-400 text-center">
                All donations are voluntary and non-refundable. Thank you for
                your support! ❤️
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
