import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form, InputGroup, Toast, ToastContainer, Tooltip, OverlayTrigger, Button, Spinner } from 'react-bootstrap';
import Table from 'react-bootstrap/Table';
import Card from 'react-bootstrap/Card';
import { apiService } from '../services/apiService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExchange, faSort, faSortAsc, faSortDesc, faThumbTack, faThumbsUp, faThumbsDown, faCircleCheck, faPencil, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import ProjectHeader from './ProjectHeader';
import ConfirmationModal from './ConfirmationModal';
import PartModal from './PartModal';
import { useAuth } from '../contexts/AuthContext';

function AllPartsForProjectTableView({ isViewOnly = false }) {
  const { user } = useAuth();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [userCanEdit, setUserCanEdit] = useState(!isViewOnly);
  const [parts, setParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  // State for PartModal
  const [selectedPart, setSelectedPart] = useState(null);
  const [showPartModal, setShowPartModal] = useState(false);
  const [currentPartIndex, setCurrentPartIndex] = useState(-1);
  // More filters
  const [filterReviewed, setFilterReviewed] = useState(false);
  const [filterExternalHit, setFilterExternalHit] = useState(false);

  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [editedParts, setEditedParts] = useState({}); // Stores { partId: { field: value } }
  const [saveLoading, setSaveLoading] = useState(false);

  const REVIEW_STATUS_MAPPINGS = {
    'reviewed': { color: '#28a745', titleText: 'Reviewed'},
    'needs_further_review': { color: '#d5b60a', titleText: 'Needs further review'},
    'more_photos_requested': { color: '#950606', titleText: 'More photos requested' },
    'never_reviewed': { color: '#6c757d', titleText: 'Not reviewed' }
  };

  const normalize = (val) => {
    return (val || '').toString()
                      .toLowerCase()
                      .replace(/[^a-z0-9]/gi, ''); // strip non-alphanumeric
  };

  // Function to get status indicator for parts
  const getStatusIndicator = (part) => {
    const reviewStatus = part.reviewStatus || 'never_reviewed';
    const color = REVIEW_STATUS_MAPPINGS[reviewStatus]?.color || '#6c757d';
    const title = REVIEW_STATUS_MAPPINGS[reviewStatus]?.titleText || 'Needs further review';

    return (
      <>
        {part.gotExternalHit && (
          <span class="custom-tooltip" data-tooltip="Has external data">
           <FontAwesomeIcon
            icon={faCircleCheck}
            style={{
              color: '#28a745',
              fontSize: '14px',
              marginRight: '6px'
            }}
           />
          </span>
        )}
        <span class="custom-tooltip" data-tooltip={title}>
         <FontAwesomeIcon
          icon={reviewStatus == 'reviewed' || reviewStatus == 'needs_further_review' ? faThumbsUp : faThumbsDown}
          style={{
            color: color,
            fontSize: '14px',
            marginRight: '6px'
          }}
         />
        </span>
      </>
    );
  };

  useEffect(() => {
    const fetchAllPartsForProject = async () => {
        const response = await apiService.getAllPartsForProject(projectId);
        const parts = response.data.parts || [];
        parts.forEach((part) => {
            part['boxName'] = response.data.boxNames[part.boxId];
            part['locationTree'] = response.data.locationTree[part.boxId];
        });
        setParts(parts);
        setFilteredParts(parts);
        console.log(response.data);
        setProject({
          projectId: projectId,
          projectName: response.data.projectName,
          packingSlipUrl: response.data.packingSlipUrl || ''
        });

        setUserCanEdit(userCanEdit && !(response.data?.projectOwnerId !== user?.user_id));
    };
    if (projectId) {
        fetchAllPartsForProject();
    }
  }, [projectId]);

  // Filtering
  useEffect(() => {
    const normFilter = normalize(filterText);
    setFilteredParts(
      parts.filter(part => {
        // 1. Check Review Status Filter (Thumbs Up)
        // 2. Check External Data Filter (Green Check)
        if ((filterReviewed && part.reviewStatus == 'reviewed') || (filterExternalHit && part.gotExternalHit)) {
            return false;
        }
        // 3. Filter other fields
        if (filterField === 'all') {
            return Object.values(part).some(value =>
                Array.isArray(value)
                ? value.some(item => normalize(item).includes(normFilter))
                : normalize(value).includes(normFilter)
            );
        } else {
            const value = part[filterField];
            return Array.isArray(value) ? value.some(item => normalize(item).includes(normFilter)) : normalize(value).includes(normFilter);
        }
      })
    );
  },[filterText, filterField, parts, filterReviewed, filterExternalHit]);

  // Sorting
  const handleSort = key => {
      const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
      const sorted = [...filteredParts].sort((a, b) => {
        const valA = normalize(a[key]) || '';
        const valB = normalize(b[key]) || '';
        // Special handling for "name"
        if (key === 'name') {
          const nameCompareResult = valA.localeCompare(valB, undefined, {
            numeric: true,
            sensitivity: 'base'
          });
          return direction == 'asc' ? nameCompareResult : -nameCompareResult;
        }
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });

      setSortConfig({ key, direction });
      setFilteredParts(sorted);
  };

  // Function to handle part modal opening with navigation context
  const handlePartClick = (part, index, e) => {
    e.preventDefault();

    // Set the current part index based on the filtered parts
    setCurrentPartIndex(index);
    setSelectedPart(part);
    setShowPartModal(true);
  };

  // Function to handle part navigation and status updates from the modal
  const handlePartChange = (newIndex = null, updatedPart = null) => {
    // Handle navigation case
    if (newIndex !== null && newIndex >= 0 && newIndex < filteredParts.length) {
      const newPart = filteredParts[newIndex];
      setSelectedPart(newPart);
      setCurrentPartIndex(newIndex);
    }

    // Handle status update case
    if (updatedPart && updatedPart.partId) {
      // Update the part in both parts and filteredParts arrays
      setParts(prevParts => 
        prevParts.map(part => 
          part.partId === updatedPart.partId ? { ...part, ...updatedPart } : part
        )
      );

      setFilteredParts(prevFilteredParts => 
        prevFilteredParts.map(part => 
          part.partId === updatedPart.partId ? { ...part, ...updatedPart } : part
        )
      );

      // Update the selected part if it's the one that was updated
      if (selectedPart?.partId === updatedPart.partId) {
        setSelectedPart(updatedPart);
      }
    }
  };

  const columns = [
    { key: 'boxName', label: 'Location Name' },
    { key: 'name', label: 'Part Name' },
    // Fields that are derived from primary image uploads and manual content
    { key: 'mpn', label: 'MPN' },
    { key: 'secondarypartnumber', label: 'Secondary PN' },
    { key: 'quantity', label: 'QTY' },
    { key: 'manufacturer', label: 'MFR' },
    { key: 'datecode', label: 'Datecode' },
    { key: 'coo', label: 'COO' },
    { key: 'rohsstatus', label: 'RoHS' },
    { key: 'packaging', label: 'Packaging' },
    { key: 'msl', label: 'MSL' },
    { key: 'serialnumber', label: 'Serial No.'},
    { key: 'lotcode', label: 'Lot Code'},
    // Manually provided notes
    { key: 'notes', label: 'Notes' },
    { key: 'partCreatorName', label: 'Created by' },
    { key: 'dateCreated', label: 'Captured' },
    // Fields that are derived from IPN image uploads and manual content
    { key: 'ipn', label: 'IPN'},
    { key: 'ipnquantity', label: 'Internal QTY'},
    { key: 'ipnserial', label: 'Internal Serial No.'},
    { key: 'ipnlotcode', label: 'Internal Lot Code'},
    { key: 'ipnbatch', label: 'Internal Batch No.'},
    // Fields that are generated from external API
    { key: 'category', label: 'Category'},
    { key: 'eccn', label: 'ECCN'},
    { key: 'htsus', label: 'HTSUS'},
    { key: 'taric', label: 'TARIC'},
    { key: 'price_at_my_break', label: 'Price at my break'},
    { key: 'quantity_at_my_break', label: 'Quantity at my break'},
    { key: 'lowest_price_at_any_break', label: 'Lowest price at any break'},
    { key: 'quantity_at_that_price_break', label: 'Quantity at that price break'}
  ];

  const EDITABLE_COLUMNS = new Set([
    'mpn',
    'secondarypartnumber',
    'quantity',
    'manufacturer',
    'datecode',
    'coo',
    'rohsstatus',
    'packaging',
    'msl',
    'serialnumber',
    'lotcode',
    'notes',
    'ipn',
    'ipnquantity',
    'ipnserial',
    'ipnlotcode',
    'ipnbatch'
  ]);

  const handleInputChange = (partId, field, value) => {
    setEditedParts(prev => ({
      ...prev,
      [partId]: {
        ...(prev[partId] || {}),
        [field]: value
      }
    }));
  };

  // Save function: Only sends updates for parts that were actually modified
  const handleBulkSave = async () => {
    const partIdsToUpdate = Object.keys(editedParts);
    if (partIdsToUpdate.length === 0) {
      setIsBulkEditing(false);
      return;
    }
    setSaveLoading(true);
    try {
      const updatePromises = partIdsToUpdate.map(partId => {
        const updates = editedParts[partId];
        const originalPart = parts.find((p) => p.partId === partId);
        // Syncing with PartModal's logic: update top-level and manualContent
        const updatedPart = {
          ...updates,
          manualContent: {
            ...(originalPart.manualContent || {}),
            ...updates
          },
          reviewStatus: 'reviewed',
          status: 'reviewed'
        };
        return apiService.updatePart(partId, updatedPart).then(response => {
          // Update local state for each modified part using handlePartChange
          handlePartChange(null, { partId, ...updatedPart });
          return response;
        });
      });
      await Promise.all(updatePromises);
      // Update and clear
      setToastMessage(`Successfully updated ${partIdsToUpdate.length} parts.`);
      setShowToast(true);
      setIsBulkEditing(false);
      setEditedParts({});
    } catch (err) {
      setToastMessage("Failed to save updates.");
      setShowToast(true);
    } finally {
      setSaveLoading(false);
    }
  };

  const getFieldValueForPart = (part, field) => {
    return part?.manualContent?.[field] || part?.generatedContent?.[field] || part?.[field] || '';
  }

  const onCopyPublicProjectUrl = () => {
    const link = `${window.location.origin}/project/${projectId}/allparts/view`;
    navigator.clipboard.writeText(link)
        .then(() => setToastMessage("Successfully copied link to clipboard"))
        .catch(() => setToastMessage("Failed to copy link"));
    setShowToast(true);
  };

  // Function to handle project deletion
  const handleDeleteProject = () => {
    setShowDeleteModal(true);
  };

  // Function to confirm deletion
  const confirmDelete = async () => {
    try {
      setDeleteLoading(true);
      await apiService.deleteProject(projectId);
      // Navigate back to dashboard on successful deletion
      navigate('/');
    } catch (error) {
      console.error('Failed to delete project:', error);
      setToastMessage(`Failed to delete project. Please try again.`);
      setShowToast(true);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <Container fluid className="py-5 ic-container">
      <ProjectHeader
        project={project}
        projectId={projectId}
        leftButtons={[
            {
              text: 'Location View',
              icon: faThumbTack,
              destinationUrl: `/project/${projectId}/${userCanEdit ? 'edit' : 'view'}`,
              title: 'Go to location view'
            },
            {
              text: 'Part Comparison Tool',
              icon: faExchange,
              destinationUrl: `/project/${projectId}/compare`,
              title: 'Go to part comparsion',
              dontShow: !userCanEdit
            },
        ]}
        showAddLocation={false}
        onProjectUpdate={setProject}
        onDeleteProject={handleDeleteProject}
        onShowToast={(message) => {
          setToastMessage(message);
          setShowToast(true);
        }}
        userCanEdit={userCanEdit}
        onCopyPublicProjectUrl={onCopyPublicProjectUrl}
      />

      <Row className="mb-3 align-items-start">
          {/* Left Column: Vertical stack of Filter and Checkboxes */}
          <Col className="d-flex flex-column gap-0">

            {/* Filter Field Row */}
            <InputGroup style={{ maxWidth: '400px' }}>
              <Form.Select value={filterField} onChange={e => setFilterField(e.target.value)}>
                <option value="all">All Fields</option>
                {columns.map(col => (
                  <option key={col.key} value={col.key}>{col.label}</option>
                ))}
              </Form.Select>
              <Form.Control
                type="text"
                autoComplete="new-password"
                name="chrome-hack"
                placeholder="Filter parts..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                className="filter-input"
              />
            </InputGroup>

            {/* Checkbox Row (aligned under filter) */}
            <div className="d-flex align-items-center">
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="tooltip-reviewed">Unreviewed parts</Tooltip>}
              >
                <span className="d-inline-block">
                  <Form.Check
                    type="checkbox"
                    id="filter-reviewed"
                    label={<FontAwesomeIcon icon={faThumbsDown} style={{color: "#6c757d"}} />}
                    checked={filterReviewed}
                    onChange={(e) => setFilterReviewed(e.target.checked)}
                  />
                </span>
              </OverlayTrigger>

              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="tooltip-external">Parts with no external data</Tooltip>}
              >
                <span className="d-inline-block ms-4">
                  <Form.Check
                    type="checkbox"
                    id="filter-external"
                    label={<FontAwesomeIcon icon={faCircleCheck} style={{color: "#6c757d"}} />}
                    checked={filterExternalHit}
                    onChange={(e) => setFilterExternalHit(e.target.checked)}
                  />
                </span>
              </OverlayTrigger>
            </div>
          </Col>

          {/* Right Column: Edit/Save/Cancel Buttons */}
          <Col xs="auto" className="ms-auto d-flex align-items-start pt-1">
            <div className="d-flex gap-2">
              {userCanEdit && !isBulkEditing && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setIsBulkEditing(true)}
                >
                  <FontAwesomeIcon icon={faPencil} className="me-1" /> Edit Parts Information
                </Button>
              )}

              {isBulkEditing && (
                <>
                  {Object.keys(editedParts).length > 0 && (
                    <span className="text-muted small align-self-center me-2">
                      {Object.keys(editedParts).length} parts changed
                    </span>
                  )}
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleBulkSave}
                    disabled={saveLoading}
                  >
                    {saveLoading ? <Spinner size="sm" /> : <><FontAwesomeIcon icon={faCheck} className="me-1" /> Save</>}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { setIsBulkEditing(false); setEditedParts({}); }}
                  >
                    <FontAwesomeIcon icon={faTimes} className="me-1" /> Cancel
                  </Button>
                </>
              )}
            </div>
          </Col>
      </Row>

      <Row>
        <Col>
          <Card className="shadow-sm">
            <Card.Body style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                <Table className="mb-0" style={{ minWidth: '1200px' }} size="sm">
                  <thead 
                    className="table-light" 
                    style={{ 
                      position: 'sticky', 
                      top: 0, 
                      zIndex: 10,
                      backgroundColor: '#f8f9fa'
                    }}
                  >
                    <tr>
                      {columns.map((column, index) => (
                        <th 
                          key={column.key}
                          onClick={() => handleSort(column.key)}
                          style={{ 
                            fontWeight: '600',
                            borderRight: index < columns.length - 1 ? '1px solid #dee2e6' : 'none',
                            whiteSpace: 'nowrap',
                            fontSize: '14px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            paddingTop: '2px',
                            paddingBottom: '2px',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          {column.label}
                          <FontAwesomeIcon 
                            icon={sortConfig.key === column.key ? (sortConfig.direction === 'asc' ? faSortAsc : faSortDesc) : faSort} 
                            style={{ marginLeft: '5px', fontSize: '12px' }}
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParts.length > 0 ? (
                      filteredParts.map((part, idx) => {
                        const isEvenRow = idx % 2 === 0;
                        return (
                          <tr 
                            key={idx}
                            style={{ 
                              backgroundColor: isEvenRow ? '#f9f9f9' : '#ffffff'
                            }}
                          >
                            {columns.map((column) => (
                              <td
                                key={column.key}
                                className="ic-small"
                                style={{
                                  paddingLeft: '0.75rem',
                                  borderRight: '1px solid #e9ecef',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {column.key == 'boxName' && (
                                  <Link
                                    to="#"
                                    title={part.locationTree}
                                    style={{ textDecoration: 'none', color: '#0066cc', fontWeight: 'bold' }}
                                  >
                                    📦 {part.boxName}
                                  </Link>
                                )}
                                {column.key == 'name' && (
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {getStatusIndicator(part)}
                                    <Link
                                      to={`/part/${part.partId}`}
                                      onClick={(e) => handlePartClick(part, idx, e)}
                                      style={{ textDecoration: 'none', color: '#333', cursor: 'pointer' }}
                                    >
                                      🔧 {part.name}
                                    </Link>
                                  </div>
                                )}
                                {column.key == 'dateCreated' && (
                                    new Date(part.dateCreated).toLocaleDateString() + ' at ' + new Date(part.dateCreated).toLocaleTimeString()
                                )}
                                {column.key != 'boxName' && column.key != 'name' && column.key != 'dateCreated' && (
                                    isBulkEditing && EDITABLE_COLUMNS.has(column.key) ? (
                                      <Form.Control
                                        size="sm"
                                        type="text"
                                        className="py-0 px-1"
                                        style={{ fontSize: '11px', height: '24px' }}
                                        value={editedParts[part.partId]?.[column.key] ?? getFieldValueForPart(part, column.key) ?? ''}
                                        onChange={(e) => handleInputChange(part.partId, column.key, e.target.value)}
                                      />
                                    ) : (
                                      getFieldValueForPart(part, column.key)
                                    )
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={columns.length} className="text-center text-muted py-4">
                          {filterText ? 'No parts found matching your filter.' : 'No parts found in this project.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Part Details Modal */}
      <PartModal 
        show={showPartModal} 
        onHide={() => setShowPartModal(false)} 
        part={selectedPart}
        allParts={filteredParts}
        currentPartIndex={currentPartIndex}
        onPartChange={handlePartChange}
        projectData={project}
        currentLocation={selectedPart ? { boxId: selectedPart.boxId, boxName: selectedPart.boxName } : null}
        userCanEdit={userCanEdit}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${project?.projectName}"? This action cannot be undone.`}
        confirmText="Delete Project"
        loading={deleteLoading}
      />

      {/* Toast for notifications */}
      <ToastContainer className="p-3" position="top-end">
        <Toast 
          show={showToast} 
          onClose={() => setShowToast(false)} 
          delay={4000} 
          autohide
          bg={toastMessage?.toLowerCase()?.includes('successfully') ? "success" : "danger"}
        >
          <Toast.Body className="text-white">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
}

export default AllPartsForProjectTableView;
