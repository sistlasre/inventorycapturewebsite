import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Form, Badge, Alert, Toast, ToastContainer, InputGroup } from 'react-bootstrap';
import Table from 'react-bootstrap/Table';
import Card from 'react-bootstrap/Card';
import { apiService } from '../services/apiService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faCheckCircle, faTimesCircle, faLink, faUnlink, faSave, faFilter, faMagic, faLightbulb } from '@fortawesome/free-solid-svg-icons';
import ProjectHeader from './ProjectHeader';
import { useAuth } from '../contexts/AuthContext';

function PartsComparisonTool() {
  const { user } = useAuth();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [actualParts, setActualParts] = useState([]);
  const [expectedLineItems, setExpectedLineItems] = useState([]);
  const [selectedActualParts, setSelectedActualParts] = useState(new Set());
  const [selectedExpectedItem, setSelectedExpectedItem] = useState(null);
  const [matchedItems, setMatchedItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [userCanEdit, setUserCanEdit] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [actualPartsFilter, setActualPartsFilter] = useState('all'); // 'all', 'matched', 'unmatched'
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [expectedSearchFilter, setExpectedSearchFilter] = useState(''); // Search filter for Expected panel (MPN/Secondary PN)
  const [actualSearchFilter, setActualSearchFilter] = useState(''); // Search filter for Actual panel (MPN/IPN/Secondary PN)
  const [autoMatchLoading, setAutoMatchLoading] = useState(false);

  // Fetch project data with expected line items
  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch project details with expected line items
        const projectResponse = await apiService.api.get(`/project/${projectId}`, {
          params: { fetchExpected: true }
        });

        const projectData = projectResponse.data;
        setProject({
          projectId: projectData.projectId,
          projectName: projectData.projectName,
          packingSlipUrl: projectData.packingSlipUrl
        });

        // Parse expected line items if they exist
        if (projectData.expectedLineItems) {
          try {
            const parsed = typeof projectData.expectedLineItems === 'string' ? JSON.parse(projectData.expectedLineItems) : projectData.expectedLineItems;
            const lineItems = parsed.lineItems || [];
            // Add unique IDs to line items for tracking and preserve existing matches
            const itemsWithIds = lineItems.map((item, index) => {
              const lineItemId = item.lineItemId || `expected-${index}`;
              return {
                ...item,
                id: lineItemId,
                lineItemId: lineItemId,
                partData: item.partData || {},
                matchedParts: item.matchedParts || [],
                totalActualQuantity: item.totalActualQuantity || 0
              };
            });
            setExpectedLineItems(itemsWithIds);

            // Initialize matched items from existing data
            const initialMatches = {};
            itemsWithIds.forEach(item => {
              if (item.matchedParts && item.matchedParts.length > 0) {
                // Make sure the matched parts are stored with the correct ID as key
                initialMatches[item.id] = Array.isArray(item.matchedParts) 
                  ? item.matchedParts 
                  : [];
              }
            });
            setMatchedItems(initialMatches);
          } catch (parseError) {
            console.error('Error parsing expected line items:', parseError);
            setExpectedLineItems([]);
          }
        }

        // Fetch actual parts
        const partsResponse = await apiService.getAllPartsForProject(projectId);
        const parts = partsResponse.data.parts || [];
        parts.forEach((part) => {
          part['boxName'] = partsResponse.data.boxNames[part.boxId];
          part['locationTree'] = partsResponse.data.locationTree[part.boxId];
        });
        setActualParts(parts);

        // Check edit permissions
        setUserCanEdit(!(partsResponse.data?.projectOwnerId !== user?.user_id));

      } catch (error) {
        console.error('Error fetching project data:', error);
        setError('Failed to load project data. Please try again.');
        setToastMessage('Failed to load project data');
        setShowToast(true);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProjectData();
    }
  }, [projectId, user]);

  // Handle selecting actual parts (right side)
  const handleActualPartSelection = (partId) => {
    setSelectedActualParts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(partId)) {
        newSet.delete(partId);
      } else {
        newSet.add(partId);
      }
      return newSet;
    });
  };

  // Handle selecting expected item (left side)
  const handleExpectedItemSelection = (itemId) => {
    setSelectedExpectedItem(itemId === selectedExpectedItem ? null : itemId);
  };

  // Calculate total actual quantity for an expected item
  const getTotalActualQuantity = (expectedId) => {
    const matchedPartIds = matchedItems[expectedId] || [];
    return matchedPartIds.reduce((sum, partId) => {
      const part = actualParts.find(p => p.partId === partId);
      const quantity = part ? (parseInt(part.quantity) || 0) : 0;
      return sum + quantity;
    }, 0);
  };

  // Match selected actual parts to selected expected item and save immediately
  const handleMatchAndSave = async () => {
    if (!selectedExpectedItem || selectedActualParts.size === 0) {
      setToastMessage('Please select an expected item and at least one actual part to match');
      setShowToast(true);
      return;
    }

    console.log('Matching parts:', {
      selectedExpectedItem,
      selectedActualParts: Array.from(selectedActualParts),
      currentMatches: matchedItems
    });

    // Create the match
    const newMatches = { ...matchedItems };

    // Remove selected parts from any existing matches
    Object.keys(newMatches).forEach(expectedId => {
      if (newMatches[expectedId]) {
        newMatches[expectedId] = newMatches[expectedId].filter(
          partId => !selectedActualParts.has(partId)
        );
        // Clean up empty arrays
        if (newMatches[expectedId].length === 0) {
          delete newMatches[expectedId];
        }
      }
    });

    // Add selected parts to the new expected item
    if (!newMatches[selectedExpectedItem]) {
      newMatches[selectedExpectedItem] = [];
    }

    // Ensure we're adding part IDs as strings
    const partIdsToAdd = Array.from(selectedActualParts).map(id => String(id));
    newMatches[selectedExpectedItem] = [
      ...new Set([...newMatches[selectedExpectedItem], ...partIdsToAdd])
    ];

    console.log('New matches after update:', newMatches);

    setMatchedItems(newMatches);
    setSelectedActualParts(new Set());
    setSelectedExpectedItem(null);
    setHasUnsavedChanges(true);

    setToastMessage(`Matched ${partIdsToAdd.length} part(s) successfully. Saving...`);
    setShowToast(true);

    // Save immediately after matching
    await handleSave(newMatches);
  };

  // Remove a match and save immediately
  const handleUnmatch = async (expectedId, partId = null) => {
    const newMatches = { ...matchedItems };

    if (partId) {
      // Remove specific part from match
      newMatches[expectedId] = newMatches[expectedId].filter(id => id !== partId);
      if (newMatches[expectedId].length === 0) {
        delete newMatches[expectedId];
      }
    } else {
      // Remove all matches for this expected item
      delete newMatches[expectedId];
    }

    setMatchedItems(newMatches);
    setHasUnsavedChanges(true);
    setToastMessage('Match removed. Saving...');
    setShowToast(true);

    // Save immediately after unmatching
    await handleSave(newMatches);
  };

  // Check if a part is already matched
  const isPartMatched = (partId) => {
    return Object.values(matchedItems).some(parts => parts.includes(partId));
  };

  // Get matched parts for an expected item
  const getMatchedPartsForExpected = (expectedId) => {
    return (matchedItems[expectedId] || []).map(partId => 
      actualParts.find(part => part.partId === partId)
    ).filter(Boolean);
  };

  // Calculate match statistics
  const getMatchStats = () => {
    const totalExpected = expectedLineItems.length;
    const matchedExpected = Object.keys(matchedItems).filter(
      expectedId => matchedItems[expectedId].length > 0
    ).length;
    const totalActual = actualParts.length;
    const matchedActual = Object.values(matchedItems).reduce(
      (sum, parts) => sum + parts.length, 0
    );

    return {
      expectedMatched: matchedExpected,
      expectedTotal: totalExpected,
      actualMatched: matchedActual,
      actualTotal: totalActual
    };
  };

  // Save matches to server
  const handleSave = async (matchesToSave = null) => {
    try {
      setSaveLoading(true);

      const currentMatches = matchesToSave || matchedItems;

      console.log('Saving matches:', {
        expectedLineItems,
        matchedItems: currentMatches,
        actualParts: actualParts.map(p => ({ id: p.partId, name: p.name }))
      });

      // Prepare the updated expected line items with proper matched parts and totalActualQuantity
      const expectedLineItemsPayload = {
        lineItems: expectedLineItems.map(item => {
          const matchedPartIds = currentMatches[item.id] || [];

          // Ensure matchedPartIds are strings and valid
          const validMatchedParts = matchedPartIds
            .map(id => String(id))
            .filter(id => actualParts.some(part => part.partId === id));

          // Calculate total actual quantity for this line item
          const totalActualQuantity = validMatchedParts.reduce((sum, partId) => {
            const part = actualParts.find(p => p.partId === partId);
            const quantity = part ? (parseInt(part.quantity) || 0) : 0;
            return sum + quantity;
          }, 0);

          const lineItem = {
            partData: {
              mpn: item.partData?.mpn || '',
              secondarypartnumber: item.partData?.secondarypartnumber || '',
              manufacturer: item.partData?.manufacturer || '',
              quantity: item.partData?.quantity || '',
              datecode: item.partData?.datecode || '',
              serialnumber: item.partData?.serialnumber || '',
              lotcode: item.partData?.lotcode || '',
              coo: item.partData?.coo || '',
              rohsstatus: item.partData?.rohsstatus || '',
              msl: item.partData?.msl || ''
            },
            lineItemId: item.lineItemId || item.id,
            matchedParts: validMatchedParts, // Array of valid part IDs
            totalActualQuantity: totalActualQuantity // Store total actual quantity
          };

          console.log(`Line item ${item.id}:`, {
            originalMatched: item.matchedParts,
            newMatched: validMatchedParts,
            totalActualQuantity: totalActualQuantity
          });

          return lineItem;
        })
      };

      console.log('Payload to save:', expectedLineItemsPayload);

      // Update project with new expected line items
      await apiService.updateProject(projectId, {
        expectedLineItems: JSON.stringify(expectedLineItemsPayload)
      });
      console.log(expectedLineItems);

      setHasUnsavedChanges(false);
      setToastMessage('Matches saved successfully!');
      setShowToast(true);
    } catch (error) {
      console.error('Error saving matches:', error);
      setToastMessage('Failed to save matches. Please try again.');
      setShowToast(true);
    } finally {
      setSaveLoading(false);
    }
  };

  // Helper function to normalize strings for filtering
  const normalize = (val) => {
    return (val || '').toString().toLowerCase().replace(/[^a-z0-9]/gi, '');
  };

  // Get the set of normalized, non-empty part number values for an expected item or actual part
  const getNormalizedPartNumbers = (entity, isExpected) => {
    const values = isExpected
      ? [entity.partData?.mpn, entity.partData?.secondarypartnumber]
      : [entity.mpn, entity.secondarypartnumber, entity.ipn];
    return new Set(values.map(normalize).filter(val => val.length > 0));
  };

  // Determine whether an expected item and an actual part share a part number,
  // checking MPN, Secondary PN, and IPN in any combination
  const doPartNumbersMatch = (expectedItem, actualPart) => {
    const expectedNumbers = getNormalizedPartNumbers(expectedItem, true);
    if (expectedNumbers.size === 0) return false;
    const actualNumbers = getNormalizedPartNumbers(actualPart, false);
    for (const num of actualNumbers) {
      if (expectedNumbers.has(num)) return true;
    }
    return false;
  };

  // Get the IDs of all actual parts currently matched to any expected item
  const getAllMatchedPartIds = (matches) => {
    const ids = new Set();
    Object.values(matches).forEach(parts => (parts || []).forEach(id => ids.add(id)));
    return ids;
  };

  // Find the smallest subset of candidate parts { partId, quantity } whose quantities sum
  // exactly to targetQuantity. Bounded backtracking search; returns an array of partIds,
  // or null if no exact subset exists.
  const findExactQuantitySubset = (candidates, targetQuantity) => {
    if (targetQuantity <= 0 || candidates.length === 0) return null;

    // Sort descending by quantity to find larger, fewer-item combinations first
    const sorted = [...candidates].sort((a, b) => b.quantity - a.quantity);
    let best = null;

    const search = (startIndex, remaining, chosen) => {
      if (remaining === 0) {
        if (!best || chosen.length < best.length) {
          best = [...chosen];
        }
        return;
      }
      if (remaining < 0 || startIndex >= sorted.length) return;
      // Prune: further additions can't beat an already-found smaller subset
      if (best && chosen.length + 1 >= best.length) return;

      for (let i = startIndex; i < sorted.length; i++) {
        chosen.push(sorted[i].partId);
        search(i + 1, remaining - sorted[i].quantity, chosen);
        chosen.pop();
      }
    };

    search(0, targetQuantity, []);
    return best;
  };

  // Compute automatic matches for expected items that currently have no matched parts.
  // Never touches expected items that already have at least one manual/existing match.
  // Returns { newMatches, matchedExpectedCount, matchedActualCount }
  const computeAutoMatches = () => {
    const newMatches = { ...matchedItems };
    const alreadyMatchedActualIds = getAllMatchedPartIds(matchedItems);

    // Pool of actual parts eligible for auto-matching
    let pool = actualParts.filter(part => !alreadyMatchedActualIds.has(part.partId));

    // Only consider expected items with no existing matches
    const unmatchedExpectedItems = expectedLineItems.filter(
      item => !newMatches[item.id] || newMatches[item.id].length === 0
    );

    let matchedExpectedCount = 0;
    let matchedActualCount = 0;

    const getCandidates = (item) => pool.filter(part => doPartNumbersMatch(item, part));

    // Pass 1: exact 1:1 matches, least ambiguous items first
    const pass1Order = [...unmatchedExpectedItems].sort(
      (a, b) => getCandidates(a).length - getCandidates(b).length
    );
    const stillUnmatched = [];

    pass1Order.forEach(item => {
      const expectedQty = parseInt(item.partData?.quantity) || 0;
      const candidates = getCandidates(item);
      const exactQtyCandidates = candidates.filter(
        part => expectedQty > 0 && (parseInt(part.quantity) || 0) === expectedQty
      );

      if (exactQtyCandidates.length === 1) {
        const match = exactQtyCandidates[0];
        newMatches[item.id] = [String(match.partId)];
        pool = pool.filter(part => part.partId !== match.partId);
        matchedExpectedCount += 1;
        matchedActualCount += 1;
      } else {
        stillUnmatched.push(item);
      }
    });

    // Pass 2: multi-row sum matches, least ambiguous items first
    const pass2Order = [...stillUnmatched].sort(
      (a, b) => getCandidates(a).length - getCandidates(b).length
    );

    pass2Order.forEach(item => {
      const expectedQty = parseInt(item.partData?.quantity) || 0;
      if (expectedQty <= 0) return;
      const candidates = getCandidates(item);
      if (candidates.length === 0) return;

      const totalCandidateQty = candidates.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);

      let subsetIds = null;
      if (totalCandidateQty === expectedQty) {
        subsetIds = candidates.map(p => p.partId);
      } else if (candidates.length <= 15) {
        subsetIds = findExactQuantitySubset(
          candidates.map(p => ({ partId: p.partId, quantity: parseInt(p.quantity) || 0 })),
          expectedQty
        );
      }

      if (subsetIds && subsetIds.length > 0) {
        newMatches[item.id] = subsetIds.map(id => String(id));
        pool = pool.filter(part => !subsetIds.includes(part.partId));
        matchedExpectedCount += 1;
        matchedActualCount += subsetIds.length;
      }
    });

    return { newMatches, matchedExpectedCount, matchedActualCount };
  };

  // Run auto-matching across all eligible expected items and save immediately
  const handleAutoMatch = async () => {
    setAutoMatchLoading(true);
    try {
      const { newMatches, matchedExpectedCount, matchedActualCount } = computeAutoMatches();

      if (matchedExpectedCount === 0) {
        setToastMessage('No new automatic matches found');
        setShowToast(true);
        return;
      }

      setMatchedItems(newMatches);
      setHasUnsavedChanges(true);
      setToastMessage(`Auto-matched ${matchedExpectedCount} expected item(s) using ${matchedActualCount} actual part(s). Saving...`);
      setShowToast(true);

      await handleSave(newMatches);
    } finally {
      setAutoMatchLoading(false);
    }
  };

  // Get the IDs of unmatched actual parts suggested for the currently selected expected item
  const getSuggestedActualPartIds = () => {
    if (!selectedExpectedItem) return new Set();
    const item = expectedLineItems.find(i => i.id === selectedExpectedItem);
    if (!item) return new Set();

    const matchedIds = getAllMatchedPartIds(matchedItems);
    const suggested = actualParts.filter(
      part => !matchedIds.has(part.partId) && doPartNumbersMatch(item, part)
    );
    return new Set(suggested.map(p => p.partId));
  };

  // Filter expected items based on the Expected panel's own search filter
  const filterExpectedBySearch = (item) => {
    if (!expectedSearchFilter) return true;
    const normFilter = normalize(expectedSearchFilter);
    return (
      normalize(item.partData?.mpn).includes(normFilter) ||
      normalize(item.partData?.secondarypartnumber).includes(normFilter)
    );
  };

  // Filter actual parts based on the Actual panel's own search filter
  const filterActualBySearch = (part) => {
    if (!actualSearchFilter) return true;
    const normFilter = normalize(actualSearchFilter);
    return (
      normalize(part.mpn).includes(normFilter) ||
      normalize(part.ipn).includes(normFilter) ||
      normalize(part.secondarypartnumber).includes(normFilter)
    );
  };

  // Get filtered expected items
  const getFilteredExpectedItems = () => {
    return expectedLineItems.filter(filterExpectedBySearch);
  };

  // Filter actual parts based on matched status and search filter; bring suggested
  // matches (for the selected expected item) to the top of the list
  const getFilteredActualParts = () => {
    let filtered = actualParts;

    // Apply matched/unmatched filter
    if (actualPartsFilter === 'matched') {
      filtered = filtered.filter(part => isPartMatched(part.partId));
    } else if (actualPartsFilter === 'unmatched') {
      filtered = filtered.filter(part => !isPartMatched(part.partId));
    }

    // Apply search filter
    filtered = filtered.filter(filterActualBySearch);

    // When an expected item is selected, surface suggested matches at the top
    if (selectedExpectedItem) {
      const suggestedIds = getSuggestedActualPartIds();
      if (suggestedIds.size > 0) {
        const suggested = [];
        const rest = [];
        filtered.forEach(part => {
          (suggestedIds.has(part.partId) ? suggested : rest).push(part);
        });
        filtered = [...suggested, ...rest];
      }
    }

    return filtered;
  };

  const filteredExpectedItems = getFilteredExpectedItems();
  const filteredActualParts = getFilteredActualParts();
  const suggestedPartIds = getSuggestedActualPartIds();
  const selectedExpectedItemData = selectedExpectedItem
    ? expectedLineItems.find(item => item.id === selectedExpectedItem)
    : null;
  const stats = getMatchStats();

  if (loading) {
    return (
      <Container fluid className="py-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="py-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 ic-container">
      <ProjectHeader
        project={project}
        projectId={projectId}
        leftButtons={[{
          text: 'Back to Parts List',
          icon: faArrowLeft,
          destinationUrl: `/project/${projectId}/allparts`,
          title: 'Go back to parts list'
        }]}
        showAddLocation={false}
        onProjectUpdate={setProject}
        onShowToast={(message) => {
          setToastMessage(message);
          setShowToast(true);
        }}
        userCanEdit={userCanEdit}
        isPartComparisonPage={true}
      />

      {/* Match Statistics */}
      <Row className="mb-3">
        <Col md={8}>
          <Card className="bg-light h-100">
            <Card.Body className="py-2">
              <div><strong>Expected:</strong> <Badge bg={stats.expectedMatched === stats.expectedTotal ? 'success' : 'warning'}>
                {stats.expectedMatched} / {stats.expectedTotal} matched
              </Badge></div>
              <div><strong>Actual:</strong> <Badge bg={stats.actualMatched === stats.actualTotal ? 'success' : 'info'}>
                {stats.actualMatched} / {stats.actualTotal} matched
              </Badge></div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="text-end">
          {hasUnsavedChanges && (
            <Badge bg="warning" className="me-2">Unsaved changes</Badge>
          )}
        </Col>
      </Row>

      {/* Action Buttons - Centered */}
      <Row className="mb-3">
        <Col className="text-center">
          <Button
            variant="outline-primary"
            className="me-2"
            onClick={handleAutoMatch}
            disabled={!userCanEdit || autoMatchLoading || saveLoading}
            title="Automatically match expected items to actual parts using part numbers and quantities"
          >
            {autoMatchLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Auto-Matching...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faMagic} className="me-2" />
                Auto-Match
              </>
            )}
          </Button>
          <Button
            variant="success"
            onClick={handleMatchAndSave}
            disabled={!selectedExpectedItem || selectedActualParts.size === 0 || saveLoading}
          >
            {saveLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Saving...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} className="me-2" />
                Save Matches
              </>
            )}
          </Button>
          {selectedExpectedItem && selectedActualParts.size > 0 && (
            <div className="mt-2 text-muted small">
              Ready to match {selectedActualParts.size} part(s) to selected expected item
            </div>
          )}
        </Col>
      </Row>

      <Row>
        {/* Expected Items (Left Side) */}
        <Col lg={6}>
          <Card className="shadow-sm mb-3">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h5 className="mb-0">Expected Line Items</h5>
                <InputGroup size="sm" style={{ width: 'auto', minWidth: '220px' }}>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faFilter} />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search MPN or Secondary PN..."
                    value={expectedSearchFilter}
                    onChange={(e) => setExpectedSearchFilter(e.target.value)}
                  />
                </InputGroup>
              </div>
            </Card.Header>
            <Card.Body style={{ padding: 0, maxHeight: '70vh', overflowY: 'auto' }}>
              {filteredExpectedItems.length === 0 ? (
                <div className="text-center text-muted p-4">
                  {expectedSearchFilter 
                    ? 'No expected items match your filter'
                    : 'No expected line items available'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <Table hover className="mb-0" size="sm" style={{ minWidth: '1100px' }}>
                    <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                        <th>MPN</th>
                        <th>Secondary PN</th>
                        <th>Qty</th>
                        <th>Actual Qty</th>
                        <th>MFR</th>
                        <th>Date Code</th>
                        <th>Lot Code</th>
                        <th>Serial No.</th>
                        <th>COO</th>
                        <th>RoHS</th>
                        <th>MSL</th>
                        <th>Matched</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpectedItems.map((item) => {
                      const matchedParts = getMatchedPartsForExpected(item.id);
                      const isSelected = selectedExpectedItem === item.id;
                      const hasMatch = matchedParts.length > 0;
                      const actualQuantity = getTotalActualQuantity(item.id);
                      const expectedQuantity = parseInt(item.partData?.quantity) || 0;

                      // Determine row highlight color
                      let rowStyle = { cursor: 'pointer' };
                      let rowClass = '';
                      let quantityStyle = {};

                      if (isSelected) {
                        rowClass = 'table-primary';
                      } else if (hasMatch) {
                        if (actualQuantity >= expectedQuantity && expectedQuantity > 0) {
                          quantityStyle.backgroundColor = '#3bb143'; // Light green
                        } else {
                          quantityStyle.backgroundColor = '#ff634f'; // Light red
                        }
                      }

                      return (
                        <React.Fragment key={item.id}>
                          <tr 
                            className={rowClass}
                            style={rowStyle}
                            onClick={() => handleExpectedItemSelection(item.id)}
                          >
                            <td style={{ whiteSpace: 'nowrap', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.partData?.mpn}>
                              <strong>{item.partData?.mpn || 'N/A'}</strong>
                            </td>
                            <td style={{ whiteSpace: 'nowrap', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.partData?.secondarypartnumber}>
                              {item.partData?.secondarypartnumber || '-'}
                            </td>
                            <td style={quantityStyle}>{item.partData?.quantity || '-'}</td>
                            <td style={quantityStyle}>
                              <strong>{actualQuantity || 0}</strong>
                            </td>
                            <td style={{ whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.partData?.manufacturer}>
                              {item.partData?.manufacturer || '-'}
                            </td>
                            <td>{item.partData?.datecode || '-'}</td>
                            <td>{item.partData?.lotcode || '-'}</td>
                            <td>{item.partData?.serialnumber || '-'}</td>
                            <td>{item.partData?.coo || '-'}</td>
                            <td>{item.partData?.rohsstatus || '-'}</td>
                            <td>{item.partData?.msl || '-'}</td>
                            <td>
                              {hasMatch ? (
                                <Badge bg="success">
                                  <FontAwesomeIcon icon={faCheckCircle} /> {matchedParts.length}
                                </Badge>
                              ) : (
                                <Badge bg="secondary">
                                  <FontAwesomeIcon icon={faTimesCircle} /> 0
                                </Badge>
                              )}
                            </td>
                          </tr>
                          {/* Show matched parts as sub-rows */}
                          {hasMatch && matchedParts.map(part => (
                            <tr key={`match-${part.partId}`} className="table-light">
                              <td colSpan="13" style={{ paddingLeft: '40px' }}>
                                <div className="d-flex align-items-center">
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnmatch(item.id, part.partId);
                                    }}
                                    className="me-2"
                                  >
                                    <FontAwesomeIcon icon={faUnlink} />
                                  </Button>
                                  <span style={{ fontSize: '0.85rem' }}>
                                    <FontAwesomeIcon icon={faArrowRight} className="text-success me-2" />
                                    <strong>{part.mpn || part.name}</strong>
                                    {part.secondarypartnumber && ` (${part.secondarypartnumber})`} - 
                                    Qty: {part.quantity}, 
                                    MFR: {part.manufacturer || '-'},
                                    Location: {part.boxName}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Actual Parts (Right Side) */}
        <Col lg={6}>
          <Card className="shadow-sm mb-3">
            <Card.Header className="bg-info text-white">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h5 className="mb-0">Actual Parts</h5>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <InputGroup size="sm" style={{ width: 'auto', minWidth: '200px' }}>
                    <InputGroup.Text>
                      <FontAwesomeIcon icon={faFilter} />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search MPN, IPN, or Secondary PN..."
                      value={actualSearchFilter}
                      onChange={(e) => setActualSearchFilter(e.target.value)}
                    />
                  </InputGroup>
                  <Form.Select
                    size="sm"
                    value={actualPartsFilter}
                    onChange={(e) => setActualPartsFilter(e.target.value)}
                    style={{ width: 'auto' }}
                    className="bg-white text-dark"
                  >
                    <option value="all">All Parts ({actualParts.length})</option>
                    <option value="matched">
                      Matched ({actualParts.filter(p => isPartMatched(p.partId)).length})
                    </option>
                    <option value="unmatched">
                      Unmatched ({actualParts.filter(p => !isPartMatched(p.partId)).length})
                    </option>
                  </Form.Select>
                </div>
              </div>
            </Card.Header>
            <Card.Body style={{ padding: 0, maxHeight: '70vh', overflowY: 'auto' }}>
              {selectedExpectedItem && (
                <div className="px-3 py-2 bg-light border-bottom small">
                  {suggestedPartIds.size > 0 ? (
                    <span className="text-success">
                      <FontAwesomeIcon icon={faLightbulb} className="me-1" />
                      Showing {suggestedPartIds.size} suggested match{suggestedPartIds.size !== 1 ? 'es' : ''} for{' '}
                      <strong>{selectedExpectedItemData?.partData?.mpn || selectedExpectedItemData?.partData?.secondarypartnumber || 'the selected item'}</strong>
                      {' '}at the top of the list below.
                    </span>
                  ) : (
                    <span className="text-muted">
                      <FontAwesomeIcon icon={faLightbulb} className="me-1" />
                      No unmatched parts found with a matching part number for the selected expected item.
                    </span>
                  )}
                </div>
              )}
              {filteredActualParts.length === 0 ? (
                <div className="text-center text-muted p-4">
                  {actualPartsFilter === 'all' 
                    ? 'No actual parts found'
                    : `No ${actualPartsFilter} parts found`}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <Table hover className="mb-0" size="sm" style={{ minWidth: '1000px' }}>
                    <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                        <th width="40">Select</th>
                        <th>Location</th>
                        <th>MPN</th>
                        <th>Secondary PN</th>
                        <th>IPN</th>
                        <th>Qty</th>
                        <th>MFR</th>
                        <th>Date Code</th>
                        <th>COO</th>
                        <th>RoHS</th>
                        <th>MSL</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                    {filteredActualParts.map((part) => {
                      const isSelected = selectedActualParts.has(part.partId);
                      const isMatched = isPartMatched(part.partId);
                      const isSuggested = !isMatched && suggestedPartIds.has(part.partId);

                      return (
                        <tr 
                          key={part.partId}
                          className={`${isSelected ? 'table-primary' : ''} ${isMatched ? 'table-warning' : ''} ${isSuggested && !isSelected ? 'table-success' : ''}`}
                          style={{ cursor: isMatched ? 'not-allowed' : 'pointer' }}
                          onClick={() => !isMatched && handleActualPartSelection(part.partId)}
                        >
                          <td>
                            <Form.Check
                              type="checkbox"
                              checked={isSelected}
                              disabled={isMatched}
                              onChange={() => handleActualPartSelection(part.partId)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td style={{ whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={part.locationTree}>
                            📦 {part.boxName}
                          </td>
                          <td style={{ whiteSpace: 'nowrap', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={part.mpn || part.name}>
                            <strong>{part.mpn || part.name || '-'}</strong>
                          </td>
                          <td style={{ whiteSpace: 'nowrap', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={part.secondarypartnumber}>
                            {part.secondarypartnumber || '-'}
                          </td>
                          <td style={{ whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={part.ipn}>
                            {part.ipn || '-'}
                          </td>
                          <td>{part.quantity || '-'}</td>
                          <td style={{ whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={part.manufacturer}>
                            {part.manufacturer || '-'}
                          </td>
                          <td>{part.datecode || '-'}</td>
                          <td>{part.coo || '-'}</td>
                          <td>{part.rohsstatus || '-'}</td>
                          <td>{part.msl || '-'}</td>
                          <td>
                            {isMatched ? (
                              <Badge bg="warning" size="sm">Matched</Badge>
                            ) : isSuggested ? (
                              <Badge bg="success" size="sm">
                                <FontAwesomeIcon icon={faLightbulb} className="me-1" />
                                Suggested
                              </Badge>
                            ) : (
                              <Badge bg="secondary" size="sm">Available</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>


      {/* Toast for notifications */}
      <ToastContainer className="p-3" position="top-end">
        <Toast 
          show={showToast} 
          onClose={() => setShowToast(false)} 
          delay={3000} 
          autohide
          bg={toastMessage?.toLowerCase()?.includes('success') ? "success" : "info"}
        >
          <Toast.Body className="text-white">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
}

export default PartsComparisonTool;
