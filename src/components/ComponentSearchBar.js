import React, { useState, useEffect, useRef } from 'react';
import { Form, InputGroup, Dropdown, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const ComponentSearchBar = ({ 
  onSearch, 
  showDropdown = true,
  placeholder = "Search for components...",
  initialValue = "",
  searchType: initialSearchType = "exact",
  field: initialField = "mpn"
}) => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState(initialValue);
  const [searchType, setSearchType] = useState(initialSearchType);
  const [field, setField] = useState(initialField);
  const [dropdownResults, setDropdownResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for dropdown results
  useEffect(() => {
    if (!showDropdown) return;

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if less than 3 characters or not focused
    if (searchValue.length < 3 || !isFocused) {
      setDropdownResults([]);
      setShowResults(false);
      return;
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch('https://emev1efipj.execute-api.us-east-1.amazonaws.com/prod/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            search_type: searchType,
            search_source: 'search_bar',
            field: field,
            field_value: searchValue
          })
        });

        const data = await response.json();
        if (data.items) {
          // Parse the item strings and limit to first 10 results
          const parsedItems = data.items.slice(0, 10).map(item => {
            try {
              return JSON.parse(item.item);
            } catch (e) {
              console.error('Error parsing item:', e);
              return null;
            }
          }).filter(item => item !== null);

          setDropdownResults(parsedItems);
          setShowResults(true);
        }
      } catch (error) {
        console.error('Search error:', error);
        setDropdownResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchValue, searchType, field, showDropdown, isFocused]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchValue.length >= 3) {
      setShowResults(false);
      if (onSearch) {
        onSearch(searchValue, searchType, field);
      } else {
        // Navigate to search results page with query parameters
        const params = new URLSearchParams({
          search_type: searchType,
          field: field,
          field_value: searchValue
        });
        navigate(`/component_locator/search?${params.toString()}`);
      }
    }
  };

  const handleResultClick = (item) => {
    setSearchValue(item.mpn || item.manufacturer || '');
    setShowResults(false);
    // Navigate to search results with the selected item
    const params = new URLSearchParams({
      search_type: 'exact',
      field: 'mpn',
      field_value: item.mpn || ''
    });
    navigate(`/component_locator/search?${params.toString()}`);
  };

  const formatPrice = (price) => {
    return price > 0 ? `$${price.toFixed(2)}/ea` : '';
  };

  return (
    <div className="position-relative" ref={dropdownRef}>
      <Form onSubmit={handleSearch}>
        <InputGroup className="mb-3">
          <Form.Select 
            value={searchType} 
            onChange={(e) => setSearchType(e.target.value)}
            style={{ maxWidth: '150px' }}
          >
            <option value="exact">Exact Match</option>
            <option value="begins_with">Begins With</option>
          </Form.Select>

          <Form.Select 
            value={field} 
            onChange={(e) => setField(e.target.value)}
            style={{ maxWidth: '150px' }}
          >
            <option value="mpn">MPN</option>
            <option value="manufacturer">Manufacturer</option>
          </Form.Select>

          <Form.Control
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={placeholder}
            onFocus={() => {
              setIsFocused(true);
              if (searchValue.length >= 3) {
                setShowResults(true);
              }
            }}
            onBlur={() => {
              // Delay to allow click events on dropdown items
              setTimeout(() => setIsFocused(false), 200);
            }}
          />

          <button 
            className="btn btn-primary" 
            type="submit"
            disabled={searchValue.length < 3}
          >
            Search
          </button>
        </InputGroup>

        {searchValue.length > 0 && searchValue.length < 3 && (
          <small className="text-muted">Please enter at least 3 characters to search</small>
        )}
      </Form>

      {/* Dropdown results */}
      {showDropdown && showResults && (dropdownResults.length > 0 || isLoading) && (
        <div 
          className="position-absolute w-100 bg-white border rounded-bottom shadow-sm" 
          style={{ 
            top: '100%', 
            zIndex: 1050,
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          {isLoading ? (
            <div className="p-3 text-center">
              <Spinner animation="border" size="sm" /> Loading...
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {dropdownResults.map((item, index) => (
                <button
                  key={index}
                  className="list-group-item list-group-item-action"
                  onClick={() => handleResultClick(item)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="fw-bold">{item.mpn}</div>
                      <small className="text-muted">
                        {item.manufacturer} | DC: {item.dc} | Stock: {item.in_stock}
                      </small>
                    </div>
                    <div className="text-end">
                      <small className="text-primary">
                        {formatPrice(item.price_a)}
                      </small>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComponentSearchBar;
