import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Table } from 'react-bootstrap';
import { Upload, CloudUpload, CheckCircle, FileEarmarkSpreadsheet } from 'react-bootstrap-icons';
import axios from 'axios';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const UploadPricing = () => {
  const [emailAddress, setEmailAddress] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [columnMappings, setColumnMappings] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const parseCSV = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const headers = Object.keys(results.data[0]);
          const preview = {
            headers: headers,
            rows: results.data.slice(0, 5)
          };
          setFilePreview(preview);
          // Initialize empty mappings
          setColumnMappings({});
        } else {
          setError('The file appears to be empty or invalid');
        }
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  const parseExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length > 0) {
          const headers = jsonData[0];
          const rows = jsonData.slice(1, 6).map(row => {
            const rowObj = {};
            headers.forEach((header, index) => {
              rowObj[header] = row[index] || '';
            });
            return rowObj;
          });

          const preview = {
            headers: headers,
            rows: rows
          };
          setFilePreview(preview);
          // Initialize empty mappings
          setColumnMappings({});
        } else {
          setError('The file appears to be empty or invalid');
        }
      } catch (error) {
        setError(`Error parsing Excel file: ${error.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCSV && !isExcel) {
      setError('Please select a valid CSV or Excel file (.csv, .xlsx)');
      setSelectedFile(null);
      setFilePreview(null);
      return;
    }

    setSelectedFile(file);
    setError('');
    setFilePreview(null);
    setColumnMappings({});

    // Parse file to get preview
    if (isCSV) {
      parseCSV(file);
    } else {
      parseExcel(file);
    }
  };

  const handleColumnMapping = (columnName, mappingType) => {
    setColumnMappings(prev => {
      const newMappings = { ...prev };

      // Remove any previous mapping for this type
      Object.keys(newMappings).forEach(key => {
        if (newMappings[key] === mappingType) {
          delete newMappings[key];
        }
      });

      // Set new mapping if not "none"
      if (mappingType !== 'none') {
        newMappings[columnName] = mappingType;
      }

      return newMappings;
    });
  };

  const validateForm = () => {
    if (!emailAddress) {
      setError('Email address is required');
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!selectedFile) {
      setError('Please select a file to upload');
      return false;
    }

    if (!filePreview) {
      setError('File preview not available. Please select a file again.');
      return false;
    }

    // Check for required column mappings
    if (!Object.values(columnMappings).includes('mpn')) {
      setError('Part Number (mpn) column is required');
      return false;
    }

    if (!Object.values(columnMappings).includes('quantity')) {
      setError('Quantity column is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMessage('');
    setUploadSuccess(false);

    try {
      // Build the request payload with column mappings
      const requestPayload = {
        email_address: emailAddress
      };

      // Add column mappings based on user selections
      Object.entries(columnMappings).forEach(([columnName, mappingType]) => {
        if (mappingType === 'mpn') {
          requestPayload.mpn_field = columnName;
        } else if (mappingType === 'quantity') {
          requestPayload.quantity_requested_field = columnName;
        }
      });

      const fileType = selectedFile.name.toLowerCase().endsWith('.csv')
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const fileExtension = selectedFile.name.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'csv';

      // Now, add the file type and extensions as parameters we pass in
      requestPayload.file_extension = fileExtension;
      requestPayload.content_type = fileType;

      // Step 1: Get presigned URL from the API
      const presignedUrlResponse = await axios.post(
        'https://obkg1pw61g.execute-api.us-west-2.amazonaws.com/prod/get-pricing-presigned-url',
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const { presigned_url } = presignedUrlResponse.data;

      if (!presigned_url) {
        throw new Error('Failed to get upload URL');
      }

      // Step 2: Upload the file to S3 using the presigned URL
      await axios.put(presigned_url, selectedFile, {
        headers: {
          'Content-Type': fileType
        }
      });

      // Success!
      setUploadSuccess(true);
      setSuccessMessage('File uploaded successfully! Your pricing data has been submitted for processing. You should receive an email once it is processed and downloadable.');

      // Reset form
      setEmailAddress('');
      setSelectedFile(null);
      setFilePreview(null);
      setColumnMappings({});

      // Reset file input
      const fileInput = document.getElementById('csvFile');
      if (fileInput) {
        fileInput.value = '';
      }

    } catch (err) {
      console.error('Upload error:', err);

      if (err.response?.data?.message) {
        setError(`Upload failed: ${err.response.data.message}`);
      } else if (err.message) {
        setError(`Upload failed: ${err.message}`);
      } else {
        setError('An error occurred while uploading the file. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container fluid className="py-4">
      <Row className="justify-content-center">
        <Col xs={12} md={8} lg={6}>
          <Card className="shadow border-0">
            <Card.Header className="bg-primary text-white py-3">
              <h4 className="mb-0 d-flex align-items-center">
                <CloudUpload className="me-2" />
                Upload Inventory to be Priced
              </h4>
            </Card.Header>

            <Card.Body className="p-4">
              <Form onSubmit={handleSubmit}>
                {/* Email Address (Required) */}
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">
                    Email Address <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="email"
                    value={emailAddress}
                    onChange={(e) => {
                      setEmailAddress(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter your email address"
                    required
                    disabled={uploading}
                  />
                </Form.Group>

                {/* File Upload */}
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">
                    Select File <span className="text-danger">*</span>
                  </Form.Label>
                  <div className="d-flex align-items-center">
                    <Form.Control
                      id="csvFile"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      className="me-2"
                    />
                    {selectedFile && !error && (
                      <CheckCircle className="text-success" size={20} />
                    )}
                  </div>
                  {selectedFile && (
                    <Form.Text className="text-success d-block mt-2">
                      <FileEarmarkSpreadsheet className="me-1" />
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </Form.Text>
                  )}
                  <Form.Text className="text-muted">
                    Upload a CSV (.csv) or Excel (.xlsx) file containing the inventory you want priced
                  </Form.Text>
                </Form.Group>

                {/* File Preview and Column Mapping */}
                {filePreview && (
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-3">File Preview & Column Mapping</h6>
                    <p className="text-muted small mb-3">
                      Select the purpose for each column from the dropdowns below (optional)
                    </p>

                    <div className="table-responsive border rounded">
                      <Table className="mb-0" striped hover>
                        <thead>
                          <tr>
                            {filePreview.headers.map((header, index) => (
                              <th key={index} className="text-center">
                                <Form.Select
                                  size="sm"
                                  className="mb-2"
                                  value={
                                    columnMappings[header] || 'none'
                                  }
                                  onChange={(e) => handleColumnMapping(header, e.target.value)}
                                  disabled={uploading}
                                >
                                  <option value="none">-- Select --</option>
                                  <option value="mpn">Part Number</option>
                                  <option value="quantity">Quantity</option>
                                </Form.Select>
                                <div className="fw-normal text-muted small">{header}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filePreview.rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {filePreview.headers.map((header, colIndex) => (
                                <td key={colIndex} className="small">
                                  {row[header] || <span className="text-muted">-</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {filePreview.rows.length === 0 && (
                            <tr>
                              <td colSpan={filePreview.headers.length} className="text-center text-muted">
                                No data rows found in the file
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </div>

                    {Object.keys(columnMappings).length > 0 && (
                      <div className="mt-2">
                        <small className="text-muted">
                          <strong>Current mappings:</strong>{' '}
                          {Object.entries(columnMappings).map(([col, type], index) => (
                            <span key={col}>
                              {index > 0 && ', '}
                              <span className="text-primary">{col}</span> → {' '}
                              {type === 'mpn' && 'Part Number'}
                              {type === 'quantity' && 'Quantity'}
                            </span>
                          ))}
                        </small>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Alert */}
                {error && (
                  <Alert variant="danger" className="d-flex align-items-center">
                    <span>{error}</span>
                  </Alert>
                )}

                {/* Success Alert */}
                {uploadSuccess && successMessage && (
                  <Alert variant="success" className="d-flex align-items-center">
                    <CheckCircle className="me-2" />
                    <span>{successMessage}</span>
                  </Alert>
                )}

                {/* Submit Button */}
                <div className="d-grid">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={uploading || !selectedFile || !emailAddress || !filePreview}
                    className="d-flex align-items-center justify-content-center"
                  >
                    {uploading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="me-2" />
                        Upload Inventory to be Priced
                      </>
                    )}
                  </Button>
                </div>
              </Form>

              <div className="mt-4 p-3 bg-light rounded">
                <h6 className="fw-semibold mb-2">File Requirements:</h6>
                <ul className="small mb-0">
                  <li>File must be a CSV (.csv) or Excel (.xlsx) file</li>
                  <li>First row should contain column headers</li>
                  <li>Specify the columns for Part Number and Quantity</li>
                </ul>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default UploadPricing;
