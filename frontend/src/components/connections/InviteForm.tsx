import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { inviteConnection, searchUsers } from '../../store/connectionSlice';
import { AppDispatch } from '../../store';

interface InviteFormProps {
  onClose: () => void;
}

const InviteForm: React.FC<InviteFormProps> = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pseudonym, setPseudonym] = useState('');
  const [relationshipType, setRelationshipType] = useState('partner');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  
  const dispatch = useDispatch<AppDispatch>();
  
  // Handle search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Handle searching for users
  const handleSearch = async () => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await dispatch(searchUsers(searchQuery)).unwrap();
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle sending an invitation
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pseudonym || !relationshipType || inviting) return;
    
    setInviting(true);
    setError('');
    
    try {
      await dispatch(inviteConnection({ recipientPseudonym: pseudonym, relationshipType })).unwrap();
      setPseudonym('');
      setRelationshipType('partner');
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };
  
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Invite a Connection</h2>
      
      <form onSubmit={handleInvite}>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="pseudonym">
            Find by Pseudonym
          </label>
          <div className="relative">
            <input
              type="text"
              id="searchQuery"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
              placeholder="Search for a user..."
              autoComplete="off"
            />
            {isSearching && (
              <div className="absolute right-3 top-2">
                <div className="animate-spin h-5 w-5 border-2 border-teal-500 rounded-full border-t-transparent"></div>
              </div>
            )}
          </div>
          
          {searchQuery.length > 0 && (
            <div className="mt-2">
              {searchQuery.length < 3 ? (
                <p className="text-sm text-gray-500">
                  Type at least 3 characters to search
                </p>
              ) : searchResults.length === 0 && !isSearching ? (
                <p className="text-sm text-gray-500">
                  No users found with that pseudonym
                </p>
              ) : (
                <ul className="mt-2 border border-gray-200 rounded-md divide-y max-h-40 overflow-y-auto">
                  {searchResults.map((result) => (
                    <li
                      key={result.id}
                      className="p-2 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setPseudonym(result.pseudonym);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                    >
                      <p className="font-medium">{result.pseudonym}</p>
                      <p className="text-xs text-gray-500">
                        Member since{' '}
                        {new Date(result.createdAt).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        
        {pseudonym && (
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Selected User
            </label>
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="font-medium text-gray-800">{pseudonym}</p>
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-medium mb-2">
            Relationship Type
          </label>
          <select
            value={relationshipType}
            onChange={(e) => setRelationshipType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="partner">Partner</option>
            <option value="family">Family Member</option>
            <option value="friend">Friend</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            This helps Coco provide tailored guidance for your specific relationship.
          </p>
        </div>
        
        <div className="flex justify-end space-x-3 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!pseudonym || inviting}
            className={`px-4 py-2 rounded-md text-white ${
              !pseudonym || inviting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-teal-500 hover:bg-teal-600'
            }`}
          >
            {inviting ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InviteForm;