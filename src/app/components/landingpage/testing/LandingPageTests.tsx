import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  score?: number;
  details?: string[];
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  overallScore: number;
}

const LandingPageTests: React.FC = () => {
  const [testResults, setTestResults] = useState<TestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const runAccessibilityTests = (): TestResult[] => {
    const tests: TestResult[] = [];

    // Check for skip link
    const skipLink = document.querySelector('a[href="#main-content"]');
    tests.push({
      name: 'Skip Link Present',
      status: skipLink ? 'pass' : 'fail',
      message: skipLink ? 'Skip link found for keyboard navigation' : 'Skip link missing for keyboard navigation'
    });

    // Check for main landmark
    const mainElement = document.querySelector('main');
    tests.push({
      name: 'Main Landmark',
      status: mainElement ? 'pass' : 'fail',
      message: mainElement ? 'Main landmark present' : 'Main landmark missing'
    });

    // Check for heading hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const headingLevels = headings.map(h => parseInt(h.tagName.charAt(1)));
    let hierarchyValid = true;
    let previousLevel = 0;

    headingLevels.forEach(level => {
      if (level > previousLevel + 1) {
        hierarchyValid = false;
      }
      previousLevel = level;
    });

    tests.push({
      name: 'Heading Hierarchy',
      status: hierarchyValid ? 'pass' : 'warning',
      message: hierarchyValid ? 'Heading hierarchy is logical' : 'Heading hierarchy may skip levels'
    });

    // Check for alt text on images
    const images = Array.from(document.querySelectorAll('img'));
    const imagesWithoutAlt = images.filter(img => !img.alt);
    tests.push({
      name: 'Image Alt Text',
      status: imagesWithoutAlt.length === 0 ? 'pass' : 'fail',
      message: `${images.length - imagesWithoutAlt.length}/${images.length} images have alt text`
    });

    // Check for ARIA labels on interactive elements
    const buttons = Array.from(document.querySelectorAll('button'));
    const buttonsWithoutLabels = buttons.filter(btn =>
      !btn.textContent?.trim() && !btn.getAttribute('aria-label') && !btn.getAttribute('aria-labelledby')
    );
    tests.push({
      name: 'Button Labels',
      status: buttonsWithoutLabels.length === 0 ? 'pass' : 'fail',
      message: `${buttons.length - buttonsWithoutLabels.length}/${buttons.length} buttons have accessible labels`
    });

    return tests;
  };

  const runPerformanceTests = (): Promise<TestResult[]> => {
    return new Promise((resolve) => {
      const tests: TestResult[] = [];

      // Check Core Web Vitals if available
      if ('PerformanceObserver' in window) {
        try {
          // LCP Test
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            const lcp = lastEntry.startTime;

            tests.push({
              name: 'Largest Contentful Paint (LCP)',
              status: lcp <= 2500 ? 'pass' : lcp <= 4000 ? 'warning' : 'fail',
              message: `LCP: ${Math.round(lcp)}ms`,
              score: Math.max(0, 100 - (lcp / 25))
            });
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // FCP Test
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              if (entry.name === 'first-contentful-paint') {
                const fcp = entry.startTime;
                tests.push({
                  name: 'First Contentful Paint (FCP)',
                  status: fcp <= 1800 ? 'pass' : fcp <= 3000 ? 'warning' : 'fail',
                  message: `FCP: ${Math.round(fcp)}ms`,
                  score: Math.max(0, 100 - (fcp / 18))
                });
              }
            });
          });
          fcpObserver.observe({ entryTypes: ['paint'] });

        } catch (error) {
          tests.push({
            name: 'Performance Monitoring',
            status: 'warning',
            message: 'Performance monitoring not fully supported in this browser'
          });
        }
      }

      // Check resource loading
      if (performance.getEntriesByType) {
        const resources = performance.getEntriesByType('resource');
        const slowResources = resources.filter((resource: any) => resource.duration > 1000);
        const largeResources = resources.filter((resource: any) => resource.transferSize > 1000000);

        tests.push({
          name: 'Resource Loading',
          status: slowResources.length === 0 ? 'pass' : slowResources.length <= 3 ? 'warning' : 'fail',
          message: `${slowResources.length} slow resources (>1s), ${largeResources.length} large resources (>1MB)`,
          details: slowResources.map((r: any) => `${r.name}: ${Math.round(r.duration)}ms`)
        });
      }

      // Check for render-blocking resources
      const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      const renderBlockingCSS = stylesheets.filter(link =>
        !link.hasAttribute('media') || link.getAttribute('media') === 'all'
      );

      tests.push({
        name: 'Render Blocking Resources',
        status: renderBlockingCSS.length <= 2 ? 'pass' : 'warning',
        message: `${renderBlockingCSS.length} render-blocking stylesheets`
      });

      setTimeout(() => resolve(tests), 2000);
    });
  };

  const runSEOTests = (): TestResult[] => {
    const tests: TestResult[] = [];

    // Check title tag
    const title = document.title;
    tests.push({
      name: 'Page Title',
      status: title && title.length >= 30 && title.length <= 60 ? 'pass' : 'warning',
      message: `Title length: ${title.length} characters`
    });

    // Check meta description
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
    tests.push({
      name: 'Meta Description',
      status: metaDescription && metaDescription.length >= 120 && metaDescription.length <= 160 ? 'pass' : 'warning',
      message: `Description length: ${metaDescription?.length || 0} characters`
    });

    // Check for Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');

    tests.push({
      name: 'Open Graph Tags',
      status: ogTitle && ogDescription && ogImage ? 'pass' : 'warning',
      message: `${[ogTitle, ogDescription, ogImage].filter(Boolean).length}/3 essential OG tags present`
    });

    // Check for structured data
    const structuredData = document.querySelector('script[type="application/ld+json"]');
    tests.push({
      name: 'Structured Data',
      status: structuredData ? 'pass' : 'warning',
      message: structuredData ? 'JSON-LD structured data found' : 'No structured data found'
    });

    // Check for canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    tests.push({
      name: 'Canonical URL',
      status: canonical ? 'pass' : 'warning',
      message: canonical ? 'Canonical URL specified' : 'No canonical URL found'
    });

    return tests;
  };

  const runResponsiveTests = (): TestResult[] => {
    const tests: TestResult[] = [];

    // Check viewport meta tag
    const viewport = document.querySelector('meta[name="viewport"]');
    tests.push({
      name: 'Viewport Meta Tag',
      status: viewport ? 'pass' : 'fail',
      message: viewport ? 'Viewport meta tag present' : 'Viewport meta tag missing'
    });

    // Check for responsive images
    const images = Array.from(document.querySelectorAll('img'));
    const responsiveImages = images.filter(img =>
      img.hasAttribute('sizes') || img.hasAttribute('srcset')
    );

    tests.push({
      name: 'Responsive Images',
      status: responsiveImages.length / images.length >= 0.8 ? 'pass' : 'warning',
      message: `${responsiveImages.length}/${images.length} images are responsive`
    });

    // Check for touch-friendly targets
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const touchFriendly = buttons.filter(btn => {
      const rect = btn.getBoundingClientRect();
      return rect.width >= 44 && rect.height >= 44;
    });

    tests.push({
      name: 'Touch Target Size',
      status: touchFriendly.length / buttons.length >= 0.9 ? 'pass' : 'warning',
      message: `${touchFriendly.length}/${buttons.length} interactive elements are touch-friendly (44px+)`
    });

    return tests;
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setTestResults([]);

    const suites: TestSuite[] = [];

    // Accessibility Tests
    setProgress(25);
    const accessibilityTests = runAccessibilityTests();
    const accessibilityScore = (accessibilityTests.filter(t => t.status === 'pass').length / accessibilityTests.length) * 100;
    suites.push({
      name: 'Accessibility',
      tests: accessibilityTests,
      overallScore: Math.round(accessibilityScore)
    });

    // Performance Tests
    setProgress(50);
    const performanceTests = await runPerformanceTests();
    const performanceScore = (performanceTests.filter(t => t.status === 'pass').length / performanceTests.length) * 100;
    suites.push({
      name: 'Performance',
      tests: performanceTests,
      overallScore: Math.round(performanceScore)
    });

    // SEO Tests
    setProgress(75);
    const seoTests = runSEOTests();
    const seoScore = (seoTests.filter(t => t.status === 'pass').length / seoTests.length) * 100;
    suites.push({
      name: 'SEO',
      tests: seoTests,
      overallScore: Math.round(seoScore)
    });

    // Responsive Tests
    setProgress(100);
    const responsiveTests = runResponsiveTests();
    const responsiveScore = (responsiveTests.filter(t => t.status === 'pass').length / responsiveTests.length) * 100;
    suites.push({
      name: 'Responsive Design',
      tests: responsiveTests,
      overallScore: Math.round(responsiveScore)
    });

    setTestResults(suites);
    setIsRunning(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'success';
      case 'warning': return 'warning';
      case 'fail': return 'error';
      default: return 'info';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>
      <Button
        variant="contained"
        color="primary"
        onClick={runAllTests}
        disabled={isRunning}
        sx={{ mb: 2 }}
      >
        {isRunning ? 'Running Tests...' : 'Run Landing Page Tests'}
      </Button>

      {isRunning && (
        <Box sx={{ width: 300, mb: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="caption" color="textSecondary">
            Running tests... {progress}%
          </Typography>
        </Box>
      )}

      {testResults.length > 0 && (
        <Box sx={{ width: 400, maxHeight: 600, overflow: 'auto', bgcolor: 'background.paper', p: 2, borderRadius: 1, boxShadow: 3 }}>
          <Typography variant="h6" gutterBottom>
            Landing Page Test Results
          </Typography>

          {testResults.map((suite) => (
            <Accordion key={suite.name} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                    {suite.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color={getScoreColor(suite.overallScore)}
                    sx={{ fontWeight: 'bold' }}
                  >
                    {suite.overallScore}%
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {suite.tests.map((test, index) => (
                  <Alert
                    key={index}
                    severity={getStatusColor(test.status) as any}
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {test.name}
                    </Typography>
                    <Typography variant="body2">
                      {test.message}
                    </Typography>
                    {test.details && (
                      <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                        {test.details.map((detail, i) => (
                          <Typography key={i} component="li" variant="caption">
                            {detail}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Alert>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default LandingPageTests;