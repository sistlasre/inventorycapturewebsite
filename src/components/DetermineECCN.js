import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Form, Button, Alert, Spinner, Card } from 'react-bootstrap';
import MarkdownIt from 'markdown-it';
import html2pdf from 'html2pdf.js';
import { apiService } from '../services/apiService';
import countryList from '../country_list.json';
import Select from 'react-select';

const DetermineECCN = () => {
  const [htmlPreview, setHtmlPreview] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [mpn, setMpn] = useState('');
  const [eccn, setEccn] = useState('');
  const [shipTo, setShipTo] = useState(null);
  const [shipFrom, setShipFrom] = useState(null);
  const [eucFile, setEucFile] = useState(null);

  const [loadingReport, setLoadingReport] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [numPoll, setNumPoll] = useState(0);
  const pollingRef = useRef(null);
  const reportRef = useRef(null);

  const countryOptions = countryList.map((c) => ({ value: c, label: c }));

  // Helper to handle PDF Generation
  const generatePDF = () => {
    if (!reportRef.current) return;
    setPdfLoading(true);
    // 1. Clone the preview element
    const pdfElement = reportRef.current.cloneNode(true);
    // 2. Remove the scroll restrictions so all content is "visible" to the canvas
    pdfElement.style.maxHeight = 'none';
    pdfElement.style.overflow = 'visible';
    pdfElement.style.height = 'auto';

    const fileName = (mpn || eccn) + '_compliance_report.pdf';

    html2pdf()
      .from(pdfElement)
      .set({
        margin: 10,
        filename: fileName,
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .save()
      .then(() => setPdfLoading(false));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mpn && !eccn) return alert('Please enter an MPN or an ECCN');
    if (!shipTo || !shipFrom) return alert('Please select both Ship To and Ship From countries');
    if (!eucFile) return alert('Please upload the End User Compliance (EUC) file');

    setLoadingReport(true);
    setReportReady(false);

    try {
      // 1. Get Presigned URL for EUC
      const presignedResp = await apiService.getPresignedUploadUrlForEucUpload();
      const { presigned_url, euc_s3_key, when } = presignedResp.data;

      // 2. Upload EUC file to S3
      await apiService.uploadFile(presigned_url, eucFile);

      // 3. Request the Expert ECCN Report with all parameters
      const reportParams = {
        mpn: mpn || null,
        eccn: eccn || null,
        ship_to_country: shipTo.value,
        ship_from_country: shipFrom.value,
        euc_s3_key: euc_s3_key,
        when: when, // Acting as report ID
      };
      const requestResp = await apiService.requestReport(reportParams);

      if (requestResp.status === 200) {
        startPolling(when); // Use 'when' as the identifier for polling
      }
    } catch (error) {
      console.error('Process failed:', error);
      alert('Failed to initiate report generation.');
      setLoadingReport(false);
    }
  };

  const startPolling = (reportId) => {
    let attempts = 0;
    pollingRef.current = setInterval(async () => {
      attempts++;
      try {
        const response = await apiService.getReport(reportId, 'eccn');
        if (response.data.report_exists) {
          const md = new MarkdownIt({
            html: true,
            linkify: true,
            typographer: true
          });
          setHtmlPreview(md.render(response.data.report));
          setReportReady(true);
          setLoadingReport(false);
          clearInterval(pollingRef.current);
        } else if (attempts >= 120) {
          clearInterval(pollingRef.current);
          setLoadingReport(false);
          alert('Report generation timed out. Please try again later.');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);
  };

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  return (
    <Card className="p-4 shadow-sm">
      <h2 className="text-center mb-4">Expert ECCN Determination</h2>

      <Form onSubmit={handleSubmit}>
        {/* Row 1: MPN/ECCN and EUC Upload */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Label className="fw-bold">Part Identification (MPN or ECCN) <span className="text-danger">*</span></Form.Label>
            <div className="d-flex gap-2 align-items-center">
              <Form.Control
                placeholder="MPN"
                value={mpn}
                onChange={(e) => setMpn(e.target.value)}
              />
              <span className="text-muted small">OR</span>
              <Form.Control
                placeholder="ECCN"
                value={eccn}
                onChange={(e) => setEccn(e.target.value)}
              />
            </div>
          </Col>
          <Col md={6}>
            <Form.Label className="fw-bold">End User Compliance (EUC) <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="file"
              onChange={(e) => setEucFile(e.target.files[0])}
              accept=".pdf,.doc,.docx"
            />
          </Col>
        </Row>

        {/* Row 2: Ship To and Ship From */}
        <Row className="mb-4">
          <Col md={6}>
            <Form.Label className="fw-bold">Ship From Country <span className="text-danger">*</span></Form.Label>
            <Select
              options={countryOptions}
              value={shipFrom}
              onChange={setShipFrom}
              placeholder="Origin..."
            />
          </Col>
          <Col md={6}>
            <Form.Label className="fw-bold">Ship To Country <span className="text-danger">*</span></Form.Label>
            <Select
              options={countryOptions}
              value={shipTo}
              onChange={setShipTo}
              placeholder="Destination..."
            />
          </Col>
        </Row>

        <Button variant="primary" type="submit" disabled={loadingReport} className="w-100 py-2">
          {loadingReport ? (
            <><Spinner animation="border" size="sm" className="me-2" /> Analyzing Compliance Data...</>
          ) : 'Request Expert Analysis'}
        </Button>
      </Form>

      {/* Report Preview Section */}
      {reportReady && (
        <div className="mt-5">
          <hr />
          <h5>Determination Preview</h5>
          <div
            ref={reportRef}
            className="bg-white p-4 border rounded mb-3"
            style={{ maxHeight: '400px', overflowY: 'auto', color: '#000' }}
            dangerouslySetInnerHTML={{ __html: htmlPreview }}
          />
          <Button variant="success" onClick={generatePDF} disabled={pdfLoading} className="w-100">
            {pdfLoading ? <Spinner animation="border" size="sm" /> : 'Download Official Report (PDF)'}
          </Button>
        </div>
      )}
    </Card>
  );
};

export default DetermineECCN;