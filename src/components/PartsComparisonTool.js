import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Form, Badge, Alert, Toast, ToastContainer, InputGroup } from 'react-bootstrap';
import Table from 'react-bootstrap/Table';
import Card from 'react-bootstrap/Card';
import { apiService } from '../services/apiService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faCheckCircle, faTimesCircle, faLink, faUnlink, faSave, faFilter } from '@fortawesome/free-solid-svg-icons';
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
  const [partNumberFilter, setPartNumberFilter] = useState(''); // Filter for MPN/IPN/Secondary PN

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
                matchedParts: item.matchedParts || []
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

  // Match selected actual parts to selected expected item
  const handleMatch = () => {
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

    setToastMessage(`Matched ${partIdsToAdd.length} part(s) successfully`);
    setShowToast(true);
  };

  // Remove a match
  const handleUnmatch = (expectedId, partId = null) => {
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
    setToastMessage('Match removed');
    setShowToast(true);
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
  const handleSave = async () => {
    try {
      setSaveLoading(true);

      console.log('Saving matches:', {
        expectedLineItems,
        matchedItems,
        actualParts: actualParts.map(p => ({ id: p.partId, name: p.name }))
      });

      // Prepare the updated expected line items with proper matched parts
      const expectedLineItemsPayload = {
        lineItems: expectedLineItems.map(item => {
          const matchedPartIds = matchedItems[item.id] || [];

          // Ensure matchedPartIds are strings and valid
          const validMatchedParts = matchedPartIds
            .map(id => String(id))
            .filter(id => actualParts.some(part => part.partId === id));

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
            matchedParts: validMatchedParts // Array of valid part IDs
          };

          console.log(`Line item ${item.id}:`, {
            originalMatched: item.matchedParts,
            newMatched: validMatchedParts
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

  // Filter parts based on part number filter
  const filterByPartNumber = (part) => {
    if (!partNumberFilter) return true;
    const normFilter = normalize(partNumberFilter);
    return (
      normalize(part.mpn).includes(normFilter) ||
      normalize(part.ipn).includes(normFilter) ||
      normalize(part.secondarypartnumber).includes(normFilter)
    );
  };

  // Filter expected items based on part number filter
  const filterExpectedByPartNumber = (item) => {
    if (!partNumberFilter) return true;
    const normFilter = normalize(partNumberFilter);
    return (
      normalize(item.partData?.mpn).includes(normFilter) ||
      normalize(item.partData?.secondarypartnumber).includes(normFilter)
    );
  };

  // Get filtered expected items
  const getFilteredExpectedItems = () => {
    return expectedLineItems.filter(filterExpectedByPartNumber);
  };

  // Filter actual parts based on matched status and part number
  const getFilteredActualParts = () => {
    let filtered = actualParts;

    // Apply matched/unmatched filter
    if (actualPartsFilter === 'matched') {
      filtered = filtered.filter(part => isPartMatched(part.partId));
    } else if (actualPartsFilter === 'unmatched') {
      filtered = filtered.filter(part => !isPartMatched(part.partId));
    }

    // Apply part number filter
    filtered = filtered.filter(filterByPartNumber);

    return filtered;
  };

  const filteredExpectedItems = getFilteredExpectedItems();
  const filteredActualParts = getFilteredActualParts();
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

      {/* Match Statistics and Filter */}
      <Row className="mb-3">
        <Col md={4}>
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
        <Col md={4}>
          <InputGroup>
            <InputGroup.Text>
              <FontAwesomeIcon icon={faFilter} />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Filter by MPN, IPN, or Secondary PN..."
              value={partNumberFilter}
              onChange={(e) => setPartNumberFilter(e.target.value)}
            />
          </InputGroup>
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
            variant="primary"
            onClick={handleMatch}
            disabled={!selectedExpectedItem || selectedActualParts.size === 0}
            className="me-2"
          >
            <FontAwesomeIcon icon={faLink} className="me-2" />
            Match Selected Parts
          </Button>
          <Button
            variant="success"
            onClick={handleSave}
            disabled={saveLoading || !hasUnsavedChanges}
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
              <h5 className="mb-0">Expected Line Items</h5>
            </Card.Header>
            <Card.Body style={{ padding: 0, maxHeight: '70vh', overflowY: 'auto' }}>
              {filteredExpectedItems.length === 0 ? (
                <div className="text-center text-muted p-4">
                  {partNumberFilter 
                    ? 'No expected items match your filter'
                    : 'No expected line items available'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <Table hover className="mb-0" size="sm" style={{ minWidth: '1000px' }}>
                    <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                        <th width="40">Select</th>
                        <th>MPN</th>
                        <th>Secondary PN</th>
                        <th>Qty</th>
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

                      return (
                        <React.Fragment key={item.id}>
                          <tr 
                            className={`${isSelected ? 'table-primary' : ''} ${hasMatch ? 'table-success' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleExpectedItemSelection(item.id)}
                          >
                            <td>
                              <Form.Check
                                type="radio"
                                checked={isSelected}
                                onChange={() => handleExpectedItemSelection(item.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td style={{ whiteSpace: 'nowrap', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.partData?.mpn}>
                              <strong>{item.partData?.mpn || 'N/A'}</strong>
                            </td>
                            <td style={{ whiteSpace: 'nowrap', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.partData?.secondarypartnumber}>
                              {item.partData?.secondarypartnumber || '-'}
                            </td>
                            <td>{item.partData?.quantity || '-'}</td>
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
                              <td colSpan="12" style={{ paddingLeft: '40px' }}>
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
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Actual Parts</h5>
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
            </Card.Header>
            <Card.Body style={{ padding: 0, maxHeight: '70vh', overflowY: 'auto' }}>
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

                      return (
                        <tr 
                          key={part.partId}
                          className={`${isSelected ? 'table-primary' : ''} ${isMatched ? 'table-warning' : ''}`}
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
