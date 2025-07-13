import React, { useState } from 'react';
import { X, Send, AlertTriangle, Search } from 'lucide-react';
import { useNetwork } from '../contexts/NetworkContext';
import { apiService } from '../services/api';

const TransactionForm = ({ onSubmit, onCancel, userBankAccounts }) => {
  const [formData, setFormData] = useState({
    fromBankAccountId: userBankAccounts && userBankAccounts.length > 0 ? userBankAccounts[0].id : '',
    toAccountNumber: '',
    toIfscCode: '',
    toBranch: '',
    amount: '',
    type: 'transfer',
    description: '',
    senderPin: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recipientDetails, setRecipientDetails] = useState(null);
  const [isLookingUpRecipient, setIsLookingUpRecipient] = useState(false);
  const { networkStatus } = useNetwork();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'toAccountNumber' || name === 'toIfscCode' || name === 'toBranch') {
      setRecipientDetails(null); // Clear recipient details on input change
    }
  };

  const handleLookupRecipient = async () => {
    setError('');
    setRecipientDetails(null);
    setIsLookingUpRecipient(true);

    if (!formData.toAccountNumber || !formData.toIfscCode || !formData.toBranch) {
      setError('Please enter recipient account number, IFSC code, and branch to look up.');
      setIsLookingUpRecipient(false);
      return;
    }

    try {
      const details = await apiService.lookupBankAccount(
        formData.toAccountNumber,
        formData.toIfscCode,
        formData.toBranch
      );
      setRecipientDetails(details);
      setSuccess('Recipient found!');
    } catch (err) {
      setError(err.message || 'Failed to look up recipient.');
    } finally {
      setIsLookingUpRecipient(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    if (!recipientDetails && networkStatus.isOnline) {
      setError('Please look up and confirm recipient details first.');
      setIsSubmitting(false);
      return;
    }
    if (!/^\d{4}$/.test(formData.senderPin)) {
      setError('Sender PIN must be a 4-digit number.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Pass the full transaction data, fromBankAccountId, and senderPin
      await onSubmit(formData, formData.fromBankAccountId, formData.senderPin);
      setSuccess('Transaction initiated successfully!');
    } catch (err) {
      setError(err.message || 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Send Money</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Offline Warning */}
          {!networkStatus.isOnline && (
            <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm">You're offline. Transaction will be queued for sync.</span>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          <div>
            <label htmlFor="fromBankAccountId" className="block text-sm font-medium text-gray-700 mb-1">
              From Account
            </label>
            <select
              id="fromBankAccountId"
              name="fromBankAccountId"
              value={formData.fromBankAccountId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              {userBankAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.bank_name} ({account.account_number}) - ₹{account.balance.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="toAccountNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Account Number
            </label>
            <input
              type="text"
              id="toAccountNumber"
              name="toAccountNumber"
              value={formData.toAccountNumber}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter account number"
              required
            />
          </div>

          <div>
            <label htmlFor="toIfscCode" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient IFSC Code
            </label>
            <input
              type="text"
              id="toIfscCode"
              name="toIfscCode"
              value={formData.toIfscCode}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter IFSC code"
              required
            />
          </div>

          <div>
            <label htmlFor="toBranch" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Branch
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                id="toBranch"
                name="toBranch"
                value={formData.toBranch}
                onChange={handleInputChange}
                className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter branch name"
                required
              />
              <button
                type="button"
                onClick={handleLookupRecipient}
                disabled={isLookingUpRecipient || !networkStatus.isOnline}
                className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                title="Look up recipient"
              >
                {isLookingUpRecipient ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </button>
            </div>
            {recipientDetails && (
              <p className="text-sm text-green-700 mt-1">
                Sending to: {recipientDetails.bank_name} ({recipientDetails.account_number})
              </p>
            )}
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount (INR)
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:focus:border-indigo-500"
            >
              <option value="transfer">Transfer</option>
              <option value="payment">Payment</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="deposit">Deposit</option>
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="What's this for?"
            />
          </div>

          <div>
            <label htmlFor="senderPin" className="block text-sm font-medium text-gray-700 mb-1">
              Your 4-Digit Bank PIN
            </label>
            <input
              type="password"
              id="senderPin"
              name="senderPin"
              value={formData.senderPin}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="****"
              maxLength={4}
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (networkStatus.isOnline && !recipientDetails)}
              className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? 'Processing...' : 'Send Money'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
