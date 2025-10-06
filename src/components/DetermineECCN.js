import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner, Card } from 'react-bootstrap';
import MarkdownIt from 'markdown-it';
import html2pdf from 'html2pdf.js';
import { apiService } from '../services/apiService';
import countryList from '../country_list.json';
import Select from 'react-select';

const DetermineECCN = ({setEccnForLicensing, setCountryForLicensing}) => {
  const [htmlPreview, setHtmlPreview] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [mpn, setMpn] = useState('');
  const [eccn, setEccn] = useState('');
  const [numPoll, setNumPoll] = useState(0);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [reportRequested, setReportRequested] = useState(false);
  const [datasheetLink, setDatasheetLink] = useState('');
  const [polling, setPolling] = useState(false);
  const pollingRef = useRef(null);
  const countryOptions = countryList.map((c) => ({ value: c, label: c }));

  const generatePDF = () => {
    setPdfLoading(true);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlPreview;

    const style = `
      .page-break { page-break-before: always; }
      .page-break-after { page-break-after: always; }
      .no-page-break { page-break-inside: avoid; }
    `;
    const styleElement = document.createElement('style');
    styleElement.innerHTML = style;
    tempDiv.appendChild(styleElement);
    const fileName = (mpn || eccn) + '_report.pdf';

    html2pdf()
      .from(tempDiv)
      .set({
        margin: 10,
        filename: fileName,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .toPdf()
      .get('pdf')
      .then((pdf) => {
        pdf.save(fileName);
        setPdfLoading(false);
      });
  };

  const uploadFile = async (file) => {
    if (!file || !mpn) return;
    setUploading(true);
    try {
      const presignedUrlResponse = await apiService.getPresignedUploadUrlForDatasheetUpload(mpn);
      const presignedUrl = presignedUrlResponse.data.presigned_url;
      await apiService.uploadFile(presignedUrl, file);
      setUploading(false);
      await requestReportAfterUpload();
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploading(false);
    }
  };

  const requestReportAfterUpload = async () => {
    try {
      setLoadingReport(true);
      const params = {report_type: 'eccn'};
      if (mpn) {
        params.mpn = mpn;
      } else if (eccn) {
        params.eccn = eccn;
      }
      const response = await apiService.requestReport(params);
      if (response.status === 200) {
        startPolling();
      }
    } catch (error) {
      console.error('Error requesting report:', error);
    }
  };

  const startPolling = () => {
    setPolling(true);
    pollingRef.current = setInterval(async () => {
      setNumPoll(numPoll + 1);
      const result = await checkReportStatus();
      if (result.exists || numPoll >= 30) {
        setLoadingReport(false);
        clearInterval(pollingRef.current);
        setPolling(false);
        setNumPoll(0);
      }
    }, 5000);
  };

  const checkReportStatus = async () => {
    try {
      const response = await apiService.getReport(mpn || eccn, 'eccn');
      const { report_exists, report, datasheet_link } = response.data;
      setDatasheetLink(datasheet_link || '');

      setReportRequested(true);
      if (report_exists) {
        const md = new MarkdownIt();
        setHtmlPreview(md.render(report));
        setReportReady(true);
        // We also will want to update our other input field to use the determined ECCN, if any
        const eccnMatch = report.match(/ECCN:[\s\*]*([A-Z0-9.]+)/i);
        if (eccnMatch) {
          setEccnForLicensing(eccnMatch[1]);
        }
        return { exists: true, datasheetLink: datasheet_link };
      } else {
        setReportReady(false);
        return { exists: false, datasheetLink: datasheet_link };
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setReportReady(false);
      return { exists: false, datasheetLink: null };
    }
  };

  const handleGetReport = async (event) => {
    if (event) {
      event.preventDefault();
    }
    if (!mpn && !eccn) {
      alert('Please enter an MPN or an ECCN');
      return;
    }

    setLoadingReport(true);
    const result = await checkReportStatus();

    if (!result.exists) {
      if (mpn && !result.datasheetLink) {
        alert('Report not available. Please upload a datasheet PDF.');
        setLoadingReport(false);
      } else {
        await requestReportAfterUpload();
      }
    } else {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Conditional rendering logic
  const showUploadSection = mpn && reportRequested && !reportReady && !datasheetLink;

  return (
    <>
      <Row className="mb-4">
        <Col className="text-center">
          <h2>Determine ECCN</h2>
        </Col>
      </Row>
      <Form onSubmit={(e) => handleGetReport(e)}>
          <Row className="mb-4">
            <Col md={9}>
              <Form.Group>
                <div className="text-center mb-0">
                <Form.Label className="fw-bold">
                  MPN <span className="text-muted">or</span> ECCN <span className="text-danger">*</span>
                </Form.Label>
                </div>
                <Row className="align-items-center text-center">
                  <Col xs={12} md={5}>
                    <Form.Control
                      type="text"
                      placeholder="MPN (e.g., MK10DN512VLK10)"
                      value={mpn}
                      onChange={(e) => setMpn(e.target.value)}
                    />
                  </Col>
                  <Col xs={12} md={1} className="my-2 my-md-0">
                    <strong>OR</strong>
                  </Col>
                  <Col xs={12} md={5}>
                    <Form.Control
                      type="text"
                      placeholder="ECCN (e.g., EAR99)"
                      value={eccn}
                      onChange={(e) => setEccn(e.target.value)}
                    />
                  </Col>
                </Row>
              </Form.Group>
            </Col>
            <Col md={3} className="pt-xs-2">
              <Form.Group controlId="country">
                  <Form.Label className="fw-bold">Shipping Country</Form.Label>
                  <Select
                    options={countryOptions}
                    onChange={(selected) => setCountryForLicensing(selected ? selected.value : '')}
                    placeholder="Select a country"
                    isClearable
                  />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col>
              <Button variant="primary" type="submit" disabled={loadingReport} className="w-100">
                {loadingReport ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    <span style={{ marginLeft: '8px' }}>We are working to generate a report</span>
                  </>
                ) : (
                  'Generate Report'
                )}
              </Button>
            </Col>
          </Row>
      </Form>

      {reportReady && (
        <>
          <Row className="mb-4">
            <Col>
              <Card>
                <Card.Body>
                  <h5>Preview</h5>
                  <div
                    style={{
                      border: '1px solid #ddd',
                      padding: '10px',
                      minHeight: '200px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                    }}
                    dangerouslySetInnerHTML={{ __html: htmlPreview }}
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col>
              <Button
                variant="secondary"
                onClick={generatePDF}
                disabled={pdfLoading || !htmlPreview}
                className="w-100"
              >
                {pdfLoading ? <Spinner animation="border" size="sm" /> : 'Download PDF'}
              </Button>
            </Col>
          </Row>
        </>
      )}

      {/* Conditional Upload Datasheet PDF Section */}
      {showUploadSection && (
        <Row className="mt-4">
          <Col md={6}>
            <h5>Upload Datasheet PDF</h5>
            <Form.Control
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files[0])}
              disabled={uploading}
            />
            <Button
              variant="secondary"
              onClick={() => uploadFile(file)}
              disabled={uploading || !file}
              className="mt-3 w-100"
            >
              {uploading ? <Spinner animation="border" size="sm" /> : 'Upload PDF and Generate Report'}
            </Button>
          </Col>
        </Row>
      )}

      {/* Disclaimer or Error Message */}
      {(mpn && reportRequested && !reportReady && !uploading && !loadingReport && !pdfLoading) && (
        <Row className="mt-4">
          <Col>
            <Alert variant="warning">
              Please upload a datasheet PDF to generate the report.
            </Alert>
          </Col>
        </Row>
      )}
    </>
  );
};

export default DetermineECCN;
