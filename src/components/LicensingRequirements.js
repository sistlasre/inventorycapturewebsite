import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner, Card } from 'react-bootstrap';
import MarkdownIt from 'markdown-it';
import html2pdf from 'html2pdf.js';
import { apiService } from '../services/apiService';
import Select from 'react-select';
import countryList from '../country_list.json';

const LicensingRequirements = ({eccn, setEccn}) => {
  const [htmlPreview, setHtmlPreview] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [numPoll, setNumPoll] = useState(0);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [reportRequested, setReportRequested] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollingRef = useRef(null);
  const [country, setCountry] = useState('');
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
    let fileName = eccn.toUpperCase().replaceAll(".", "") + "_" + country.toUpperCase().replaceAll(" ", "");
    fileName = fileName + '_report.pdf';

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

  const requestReport = async () => {
    try {
      setLoadingReport(true);
      const params = {
        report_type: 'licensing',
        eccn,
        country
      };
      const response = await apiService.requestReport(params);
      if (response.status === 200) {
        startPolling();
      }
    } catch (error) {
      console.error('Error requesting licensing report:', error);
    }
  };

  const startPolling = () => {
    setPolling(true);
    pollingRef.current = setInterval(async () => {
      setNumPoll(numPoll + 1);
      const result = await checkReportStatus();
      if (result === true || numPoll >= 30) {
        setLoadingReport(false);
        clearInterval(pollingRef.current);
        setPolling(false);
        setNumPoll(0);
      }
    }, 5000);
  };

  const checkReportStatus = async () => {
    try {
      const report_id = eccn.toUpperCase().replaceAll(".", "") + "_" + country.toUpperCase().replaceAll(" ", "");
      const response = await apiService.getReport(report_id, 'licensing');
      const { report_exists, report } = response.data;

      setReportRequested(true);
      if (report_exists) {
        //setMarkdown(report);
        const md = new MarkdownIt();
        setHtmlPreview(md.render(report));
        setReportReady(true);
        return true;
      } else {
        setReportReady(false);
        return false;
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setReportReady(false);
      return false;
    }
  };

  const handleGetReport = async (event) => {
    if (event) {
      event.preventDefault();
    }
    if (!eccn && !country) {
      alert('Please provide an ECCN and a country');
      return;
    }

    setLoadingReport(true);
    const result = await checkReportStatus();

    if (!result) {
      await requestReport();
    } else {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return (
    <>
      <Row className="mb-4">
        <Col className="text-center">
          <h2>Licensing Requirements</h2>
        </Col>
      </Row>
      <Form onSubmit={(e) => handleGetReport(e)}>
          <Row className="mb-4">
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  ECCN <span className="text-danger">*</span>
                </Form.Label>
                <Row className="align-items-center text-center">
                  <Col>
                    <Form.Control
                      type="text"
                      placeholder="ECCN (e.g., EAR99)"
                      value={eccn}
                      onChange={(e) => setEccn(e.target.value)}
                      required
                    />
                  </Col>
                </Row>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="country">
                  <Form.Label>Shipping Country <span className="text-danger">*</span></Form.Label>
                  <Select
                    options={countryOptions}
                    value={countryOptions.find((opt) => opt.value === country)}
                    onChange={(selected) => setCountry(selected ? selected.value : '')}
                    placeholder="Select a country"
                    isClearable
                    required
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
                    <span style={{ marginLeft: '8px' }}>We are working to generate the requested licensing requirements report</span>
                  </>
                ) : (
                  'Generate Licensing Requirements Report'
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
    </>
  );
};

export default LicensingRequirements;
