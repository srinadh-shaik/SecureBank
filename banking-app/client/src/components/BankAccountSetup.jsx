import React, { useState } from 'react';
import { X, Banknote, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

const indianBanks = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Union Bank of India",
  "Canara Bank",
  "Indian Bank",
  "Bank of India",
  "Central Bank of India",
  "UCO Bank",
  "IDBI Bank",
  "Yes Bank",
  "IndusInd Bank",
  "Kotak Mahindra Bank",
  "Federal Bank",
  "South Indian Bank",
  "Dhanlaxmi Bank",
  "Karnataka Bank"
];

const BankAccountSetup = ({ onCancel, onSuccess }) => {
  const { user, updateUserBankAccounts } = useAuth();
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
    pin: '',
    confirmPin: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (formData.pin !== formData.confirmPin) {
      setError('PIN and Confirm PIN do not match.');
      setIsLoading(false);
      return;
    }
    if (!/^\d{4}$/.test(formData.pin)) {
      setError('PIN must be a 4-digit number.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiService.linkBankAccount(
        formData.bankName,
        formData.accountNumber,
        formData.ifscCode,
        formData.branch,
        formData.pin
      );
      setSuccess(response.message);
      await updateUserBankAccounts(); // Refresh user's bank accounts in context
      onSuccess(); // Close modal and indicate success
    } catch (err) {
      setError(err.message || 'Failed to link bank account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Link Bank Account</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium">
              Security Warning: Do NOT enter sensitive card details (e.g., ATM card number, CVV).
              Only provide your bank account number, IFSC code, branch, and a 4-digit PIN.
            </span>
          </div>

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
            <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1">
              Bank Name
            </label>
            <select
              id="bankName"
              name="bankName"
              value={formData.bankName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Select a Bank</option>
              {indianBanks.map(bank => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <input
              type="text"
              id="accountNumber"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., 1234567890123456"
              required
            />
          </div>

          <div>
            <label htmlFor="ifscCode" className="block text-sm font-medium text-gray-700 mb-1">
              IFSC Code
            </label>
            <input
              type="text"
              id="ifscCode"
              name="ifscCode"
              value={formData.ifscCode}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., SBIN0001234"
              required
            />
          </div>

          <div>
            <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-1">
              Branch
            </label>
            <input
              type="text"
              id="branch"
              name="branch"
              value={formData.branch}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Mumbai"
              required
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
              4-Digit PIN
            </label>
            <input
              type="password"
              id="pin"
              name="pin"
              value={formData.pin}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="****"
              maxLength={4}
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPin" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm PIN
            </label>
            <input
              type="password"
              id="confirmPin"
              name="confirmPin"
              value={formData.confirmPin}
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
              disabled={isLoading}
              className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Banknote className="h-4 w-4" />
              <span>{isLoading ? 'Linking...' : 'Link Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BankAccountSetup;
